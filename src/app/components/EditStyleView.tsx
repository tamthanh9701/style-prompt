import React, { useState, useEffect } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { generateJsonPrompt, flattenPrompt, PROMPT_GROUPS, MAX_REFERENCE_IMAGES } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { getRefImages, putRefImage, deleteRefImage, type RefImageRecord, base64ToBlob } from '@/lib/db';
import { fileToBase64 } from '@/lib/storage';
import FieldInput from '@/app/components/FieldInput';
import { Download, Upload, Save, Sparkles, List, Image as ImageIcon, Plus, Camera, Trash2 } from 'lucide-react';

export default function EditStyleView({ style, settings, locale, onBack, onUpdate, onDelete, onGenerate, showToast }: {
  style: StyleLibrary;
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<StyleLibrary>) => void;
  onDelete: (id: string) => void;
  onGenerate: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [prompt, setPrompt] = useState<PromptSchema>(style.prompt as PromptSchema);
  const [editorMode, setEditorMode] = useState<'simple' | 'advanced'>('advanced');
  const [activeTab, setActiveTab] = useState<'schema' | 'images'>('schema');

  // Reference Images State (Blobs)
  const [refRecords, setRefRecords] = useState<RefImageRecord[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);

  const isDirty = JSON.stringify(prompt) !== JSON.stringify(style.prompt) || style.name !== prompt.style_name;
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  // Load Reference Images from DB
  useEffect(() => {
    let isMounted = true;

    async function loadImages() {
      setLoadingImages(true);
      try {
        const records = await getRefImages(style.id);
        if (isMounted) {
          setRefRecords(records);
          const urls: Record<string, string> = {};
          records.forEach(r => {
            urls[r.id] = URL.createObjectURL(r.data);
          });
          setImageUrls(urls);
          setLoadingImages(false);

          if (records.length !== style.ref_image_count) {
            onUpdate(style.id, { ref_image_count: records.length });
          }
        }
      } catch (err) {
        if (isMounted) setLoadingImages(false);
      }
    }

    loadImages();

    return () => {
      isMounted = false;
      Object.keys(imageUrls).forEach(id => URL.revokeObjectURL(imageUrls[id]));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style.id]);

  const updateField = (groupKey: string, fieldKey: string, value: string | string[] | number | null) => {
    setPrompt(prev => {
      const updated = { ...prev };
      const group = { ...(updated as unknown as Record<string, Record<string, unknown>>)[groupKey] };
      if (value === '' || (Array.isArray(value) && value.length === 0)) {
        group[fieldKey] = groupKey === 'negative_prompt' ? [] : null;
      } else {
        group[fieldKey] = value;
      }
      (updated as unknown as Record<string, Record<string, unknown>>)[groupKey] = group;
      return updated;
    });
  };

  const handleSave = () => {
    onUpdate(style.id, { prompt, name: prompt.style_name || style.name });
    showToast(L('edit_saved'));
  };

  const handleBack = () => {
    if (isDirty) {
      if (confirm(locale === 'vi' ? 'Bạn có thay đổi chưa lưu, vẫn thoát?' : 'You have unsaved changes, discard?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handlePruneImage = async (record: RefImageRecord) => {
    if (!confirm(locale === 'vi' ? 'Loại bỏ ảnh này khỏi thư viện?' : 'Prune this image from the library?')) return;

    await deleteRefImage(record.id);
    setRefRecords(prev => prev.filter(r => r.id !== record.id));
    URL.revokeObjectURL(imageUrls[record.id]);
    const newCount = refRecords.length - 1;
    onUpdate(style.id, { ref_image_count: newCount });
    showToast(locale === 'vi' ? 'Đã loại bỏ ảnh' : 'Image pruned');
  };

  const handleAddImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (refRecords.length + files.length > MAX_REFERENCE_IMAGES) {
      showToast(locale === 'vi' ? `Tối đa ${MAX_REFERENCE_IMAGES} ảnh` : `Max ${MAX_REFERENCE_IMAGES} images`, 'warning');
      return;
    }

    try {
      showToast(locale === 'vi' ? 'Đang thêm ảnh...' : 'Adding images...');
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const b64 = await fileToBase64(file);
        const blob = base64ToBlob(b64, file.type);
        const newRecord: RefImageRecord = {
          id: `${style.id}_ref_${Date.now()}_${i}`,
          libraryId: style.id,
          data: blob,
          mimeType: file.type,
          index: refRecords.length + i,
          source: 'original',
          addedAt: new Date().toISOString()
        };

        await putRefImage(newRecord);
        setRefRecords(prev => [...prev, newRecord]);
        setImageUrls(prev => ({ ...prev, [newRecord.id]: URL.createObjectURL(blob) }));
      }
      onUpdate(style.id, { ref_image_count: refRecords.length + files.length });
      showToast(locale === 'vi' ? 'Thêm ảnh thành công' : 'Images added', 'success');
    } catch (err) {
      showToast('Error uploading images', 'error');
    }

    e.target.value = ''; // clear
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prompt, null, 2));
    const dt = document.createElement('a');
    dt.setAttribute("href", dataStr);
    dt.setAttribute("download", `${style.name.replace(/\s+/g, '_')}_schema.json`);
    document.body.appendChild(dt);
    dt.click();
    document.body.removeChild(dt);
    showToast(locale === 'vi' ? 'Đã xuất file JSON' : 'JSON Exported');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setPrompt(prev => ({ ...prev, ...json }));
        showToast(locale === 'vi' ? 'Đã nhập JSON thành công' : 'JSON Imported Successfully');
      } catch (err) {
        showToast(locale === 'vi' ? 'File JSON không hợp lệ' : 'Invalid JSON File', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const jsonPrompt = generateJsonPrompt(prompt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); handleBack(); }}>{L('back_library')}</a>
          <h1 className="page-title">{style.name}</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            v{style.version || 1} • <span className="style-card-badge">{style.styleType || 'photo'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isDirty && <span style={{ color: 'var(--accent-warning)', alignSelf: 'center', fontSize: '0.9rem', marginRight: '8px' }}>• Unsaved</span>}
          <button className="btn btn-secondary" onClick={() => { if (confirm(locale === 'vi' ? 'Bạn có chắc muốn xóa Style này vĩnh viễn?' : 'Delete this style permanently?')) onDelete(style.id); }} style={{ color: 'var(--accent-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}><Trash2 size={16} /></button>
          <button className="btn btn-secondary" onClick={handleExportJson}><Download size={16} /> {locale === 'vi' ? 'Xuất JSON' : 'Export JSON'}</button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={16} /> {locale === 'vi' ? 'Nhập JSON' : 'Import JSON'}
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJson} />
          </label>
          <button className="btn btn-secondary" onClick={handleSave} disabled={!isDirty}><Save size={16} /> {locale === 'vi' ? 'Lưu' : 'Save'}</button>
          <button className="btn btn-primary" onClick={() => { if (isDirty) handleSave(); onGenerate(); }}><Sparkles size={16} /> {locale === 'vi' ? 'Tạo ảnh' : 'Generate'}</button>
        </div>
      </div>

      {/* Tabs - Stitch Pill UI */}
      <div style={{ display: 'inline-flex', background: 'var(--bg-tertiary)', padding: '6px', borderRadius: '12px', marginBottom: '24px', gap: '4px', alignSelf: 'flex-start' }}>
        <button className="btn" onClick={() => setActiveTab('schema')} style={{ border: 'none', background: activeTab === 'schema' ? 'var(--bg-glass-hover)' : 'transparent', color: activeTab === 'schema' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: 'none' }}><List size={16} /> Style Schema</button>
        <button className="btn" onClick={() => setActiveTab('images')} style={{ border: 'none', background: activeTab === 'images' ? 'var(--bg-glass-hover)' : 'transparent', color: activeTab === 'images' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: 'none' }}><ImageIcon size={16} /> Ref Images ({refRecords.length})</button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'schema' && (
          <div className="slide-in">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-sm)', display: 'inline-flex' }}>
                <button className={`btn btn-sm ${editorMode === 'simple' ? 'btn-primary' : ''}`} style={{ border: 'none', background: editorMode === 'simple' ? 'var(--accent-primary)' : 'transparent', color: editorMode === 'simple' ? '#fff' : 'var(--text-secondary)' }} onClick={() => setEditorMode('simple')}>Simple</button>
                <button className={`btn btn-sm ${editorMode === 'advanced' ? 'btn-primary' : ''}`} style={{ border: 'none', background: editorMode === 'advanced' ? 'var(--accent-primary)' : 'transparent', color: editorMode === 'advanced' ? '#fff' : 'var(--text-secondary)' }} onClick={() => setEditorMode('advanced')}>Advanced</button>
              </div>
            </div>

            {editorMode === 'simple' ? (
              <div className="card">
                <h3 style={{ marginBottom: '16px' }}>Flattened Prompt Preview</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>This mode shows how the AI merges your properties.</p>
                <pre style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  <div><div style={{ color: 'var(--accent-success)' }}>[POSITIVE]</div>{flattenPrompt(prompt).positive}<br /><br /><div style={{ color: 'var(--accent-danger)' }}>[NEGATIVE]</div>{flattenPrompt(prompt).negative}</div>
                </pre>
                <div style={{ marginTop: '20px' }}>
                  <label className="form-label">Raw JSON Schema (Read-Only)</label>
                  <textarea
                    className="form-input"
                    style={{ height: '300px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    readOnly
                    value={JSON.stringify(jsonPrompt, null, 2)}
                  />
                </div>
              </div>
            ) : (
              <div className="schema-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                {PROMPT_GROUPS.map(group => {
                  const groupData = (prompt as unknown as Record<string, Record<string, unknown>>)[group.key] as Record<string, unknown>;
                  if (!groupData) return null;

                  return (
                    <div key={group.key} className="card">
                      <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {group.icon} {group.label}
                      </h3>
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.keys(groupData).map(fieldKey => {
                          const fieldDef = group.fields?.find((f: any) => f.key === fieldKey) || { key: fieldKey, label: fieldKey.replace(/_/g, ' '), description: '', type: 'text' };
                          return (
                            <div key={fieldKey}>
                              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'capitalize' }}>
                                {fieldDef.label}
                              </label>
                              <FieldInput
                                field={fieldDef}
                                value={groupData[fieldKey] as any}
                                onChange={(v) => updateField(group.key, fieldKey, v)}
                                locale={locale}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="slide-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Review & Prune: Remove degraded images to maintain high fidelity style.</p>
              <div>
                <input type="file" id="add-ref" hidden multiple accept="image/*" onChange={handleAddImageUpload} />
                <button className="btn btn-secondary" onClick={() => document.getElementById('add-ref')?.click()}><Plus size={16} /> Add Reference Images</button>
              </div>
            </div>

            {loadingImages ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><div className="loading-spinner"></div> Loading images...</div>
            ) : (
              <div className="image-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {refRecords.map(r => (
                  <div key={r.id} className="card" style={{ padding: '8px', position: 'relative' }}>
                    <img src={imageUrls[r.id]} alt="Ref" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }} />
                    {style.coverImageId === r.id && <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'var(--accent-primary)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>👑 Cover</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>{r.source === 'generated' ? <><Sparkles size={12} /> Gen</> : <><Camera size={12} /> Orig</>}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-sm" style={{ background: 'var(--bg-glass-hover)', color: style.coverImageId === r.id ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={() => onUpdate(style.id, { coverImageId: r.id })}>
                          Cover
                        </button>
                        <button className="btn btn-sm" style={{ background: 'var(--bg-glass-hover)', color: 'var(--accent-danger)' }} onClick={() => handlePruneImage(r)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {refRecords.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                    No reference images yet. Upload some or they will be empty.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
