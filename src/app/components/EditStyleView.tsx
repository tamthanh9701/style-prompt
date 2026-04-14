import FieldInput from '@/app/components/FieldInput';
import React, { useState, useEffect, useRef } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema, PromptInstance, EvalRecord } from '@/types';
import { generateJsonPrompt, flattenPrompt, PROMPT_GROUPS, STYLE_GROUPS, SUBJECT_GROUPS, getGroupCategory, MAX_REFERENCE_IMAGES } from '@/types';
import { type Locale, t, getGroupLabel, getFieldLabel } from '@/lib/i18n';
import { getRefImages, getRefImageData, setRefImages as idbSetRefImages, appendRefImages, deleteAllRefImages, getGenImages, saveGenImage, deleteGenImage, type GenImageRecord } from '@/lib/db';
import { callAI, createNewVersion, addPromptInstance, addEvalRecord, fileToBase64, generateId, updateStyle, promoteStyle } from '@/lib/storage';

export default function EditStyleView({ style, settings, locale, onBack, onUpdate, onCompare, onGenerate, onTransfer, onEditImage, showToast }: {
  style: StyleLibrary;
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<StyleLibrary>) => void;
  onCompare: () => void;
  onGenerate: () => void;
  onTransfer: () => void;
  onEditImage: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [prompt, setPrompt] = useState<PromptSchema>(style.prompt);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ subject: true, artistic_style: true });
  const [activeTab, setActiveTab] = useState<'editor' | 'output' | 'json' | 'images'>('editor');
  const [genImages, setGenImages] = useState<GenImageRecord[]>([]);
  const [editorFilter, setEditorFilter] = useState<'all' | 'style' | 'subject'>('all');
  // Reference images from IndexedDB
  const [refImages, setRefImagesState] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [addingImages, setAddingImages] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  
  const isDirty = JSON.stringify(prompt) !== JSON.stringify(style.prompt) || style.name !== prompt.style_name;
  
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  // Load reference images & gen images from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingImages(true);
    getRefImageData(style.id).then((imgs: string[]) => {
      if (!cancelled) { setRefImagesState(imgs); setLoadingImages(false); }
    });
    getGenImages(style.id).then(imgs => {
      if (!cancelled) { setGenImages(imgs); }
    });
    return () => { cancelled = true; };
  }, [style.id]);

  const flattened = flattenPrompt(prompt);
  const jsonPrompt = generateJsonPrompt(prompt);
  const jsonPromptStr = JSON.stringify(jsonPrompt, null, 2);

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

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

  const handleAddImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const currentCount = refImages.length;
    const remaining = MAX_REFERENCE_IMAGES - currentCount;
    if (remaining <= 0) {
      showToast(locale === 'vi' ? `Đã đạt giới hạn tối đa ${MAX_REFERENCE_IMAGES} ảnh` : `Maximum ${MAX_REFERENCE_IMAGES} images reached`, 'warning');
      return;
    }
    setAddingImages(true);
    const newImages: string[] = [];
    const filesToProcess = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, remaining);
    for (const file of filesToProcess) {
      const b64 = await fileToBase64(file);
      newImages.push(b64);
    }
    const combined = await appendRefImages(style.id, newImages, MAX_REFERENCE_IMAGES);
    setRefImagesState(combined);
    onUpdate(style.id, { ref_image_count: combined.length, cached_variant_fields: undefined });
    showToast(locale === 'vi' ? `Đã thêm ${newImages.length} ảnh (${combined.length}/${MAX_REFERENCE_IMAGES})` : `Added ${newImages.length} images (${combined.length}/${MAX_REFERENCE_IMAGES})`);
    setAddingImages(false);
  };

  const handleDeleteRefImage = async (index: number) => {
    const updated = refImages.filter((_, i) => i !== index);
    await idbSetRefImages(style.id, updated);
    setRefImagesState(updated);
    onUpdate(style.id, { ref_image_count: updated.length, cached_variant_fields: undefined });
    showToast(locale === 'vi' ? 'Đã xóa ảnh' : 'Image deleted');
  };

  const handleDeleteGenImage = async (imgId: string) => {
    await deleteGenImage(imgId);
    setGenImages(prev => prev.filter(i => i.id !== imgId));
    showToast(locale === 'vi' ? 'Đã xóa ảnh' : 'Image deleted');
  };

  const handleMakeVariant = (img: GenImageRecord) => {
    try {
       const params = img.prompt_json ? JSON.parse(img.prompt_json) : {};
       if (!params) return;
       // To properly do this, we'd merge params back to prompt
       // For simplicity, we just navigate to Generate/Variant with this genImage context, or we apply the prompt_text back!
       // Assuming params is the generation_params used.
       alert('Feature coming soon: Pre-fills variant fields!');
    } catch(e) {}
  };

  const handleReanalyze = async () => {
    if (refImages.length === 0) {
      showToast(locale === 'vi' ? 'Cần có ảnh tham chiếu để phân tích lại' : 'Need reference images to re-analyze', 'warning');
      return;
    }
    setReanalyzing(true);
    try {
      // Use up to 6 images for re-analysis (API limit)
      const imagesToAnalyze = refImages.slice(0, 6);
      const result = await callAI(settings, 'analyzeStyle', imagesToAnalyze);
      // Merge new analysis into current prompt (keep manually edited fields)
      const newPrompt = {
        ...result,
        style_name: prompt.style_name || result.style_name,
        subject_type: prompt.subject_type || result.subject_type,
      } as PromptSchema;
      setPrompt(newPrompt);
      // Save to style
      onUpdate(style.id, { prompt: newPrompt, prompt_history: [...style.prompt_history, prompt], cached_variant_fields: undefined });
      showToast(locale === 'vi' ? '✅ Đã phân tích lại prompt từ ảnh!' : '✅ Prompt re-analyzed from images!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Re-analysis failed', 'error');
    } finally {
      setReanalyzing(false);
    }
  };


  const handleSave = () => {
    onUpdate(style.id, { prompt, prompt_history: [...style.prompt_history, prompt], name: prompt.style_name });
    showToast(L('edit_saved'));
  };

  const handleBack = () => {
    if (isDirty) {
      if (!window.confirm(locale === 'vi' ? 'Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi?' : 'You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    onBack();
  };

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); showToast(L('edit_copied')); } catch { showToast(L('edit_copy_failed'), 'error'); }
  };

  const subjectTypes: Array<{ value: string; label: string }> = [
    { value: 'character', label: L('st_character') }, { value: 'animal', label: L('st_animal') },
    { value: 'object', label: L('st_object') }, { value: 'product', label: L('st_product') },
    { value: 'scene', label: L('st_scene') }, { value: 'architecture', label: L('st_architecture') },
    { value: 'food', label: L('st_food') }, { value: 'vehicle', label: L('st_vehicle') },
    { value: 'nature', label: L('st_nature') }, { value: 'abstract', label: L('st_abstract') },
    { value: 'other', label: L('st_other') },
  ];

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); handleBack(); }}>{L('back_library')}</a>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{style.name}</h1>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.12)', color: 'var(--text-secondary)' }}>v{style.version || 1}</span>
            <span style={{
              fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px',
              background: (style.status || 'active') === 'active' ? 'rgba(34,197,94,0.15)' : (style.status || 'active') === 'draft' ? 'rgba(234,179,8,0.15)' : 'rgba(100,100,100,0.15)',
            }}>
              {(style.status || 'active') === 'active' ? '🟢 Active' : (style.status || 'active') === 'draft' ? '🟡 Draft' : '⚫ Deprecated'}
            </span>
          </div>
          <p className="page-subtitle">{L('edit_subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(style.status || 'active') === 'draft' && (
            <button className="btn" style={{ background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }}
              onClick={() => { promoteStyle(style.id); onUpdate(style.id, {}); showToast(locale === 'vi' ? 'Đã kích hoạt style!' : 'Style activated!'); }}>
              🚀 {locale === 'vi' ? 'Kích hoạt' : 'Activate'}
            </button>
          )}
          {(style.status || 'active') === 'active' && (
            <button className="btn" onClick={() => {
              const newVer = createNewVersion(style.id);
              if (newVer) { onUpdate(style.id, {}); showToast(locale === 'vi' ? `Đã tạo bản nháp v${newVer.version}` : `Created draft v${newVer.version}`); }
            }}>
              📝 {locale === 'vi' ? 'Phiên bản mới' : 'New Version'}
            </button>
          )}
          <button className="btn" onClick={onGenerate}>🖼️ {locale === 'vi' ? 'Tạo Ảnh Mới' : 'New Image'}</button>
          <button className="btn" onClick={onTransfer}>🔄 {locale === 'vi' ? 'Chuyển Style' : 'Style Transfer'}</button>
          <button className="btn" onClick={onEditImage}>✏️ {locale === 'vi' ? 'Chỉnh sửa ảnh' : 'Edit Image'}</button>
          <button className="btn" onClick={onCompare}>{L('edit_improve_btn')}</button>
          <button className={`btn ${isDirty ? 'btn-primary' : 'btn-outline'}`} 
            style={isDirty ? { animation: 'pulse 2s infinite', boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)' } : {}}
            onClick={handleSave}>
            {isDirty ? '* ' + L('edit_save_btn') : L('edit_save_btn')}
          </button>
        </div>
      </div>

      {/* Reference Images Panel - always shown with add/delete/re-analyze controls */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📷 {locale === 'vi' ? 'Ảnh tham chiếu' : 'Reference Images'}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              {loadingImages ? '...' : `${refImages.length}/${MAX_REFERENCE_IMAGES}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {refImages.length > 0 && (
              <button className="btn btn-sm" onClick={handleReanalyze} disabled={reanalyzing || refImages.length === 0}
                style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)', color: 'var(--accent-primary)' }}>
                {reanalyzing ? <><span className="loading-spinner"></span> {locale === 'vi' ? 'Đang phân tích...' : 'Analyzing...'}</> : <>🔄 {locale === 'vi' ? 'Phân tích lại' : 'Re-analyze'}</>}
              </button>
            )}
            {refImages.length < MAX_REFERENCE_IMAGES && (
              <label className="btn btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {addingImages ? <><span className="loading-spinner"></span> {locale === 'vi' ? 'Đang thêm...' : 'Adding...'}</> : <>➕ {locale === 'vi' ? 'Thêm ảnh' : 'Add Images'}</>}
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={addingImages}
                  onChange={(e) => handleAddImages(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        {loadingImages ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>⏳ {locale === 'vi' ? 'Đang tải ảnh...' : 'Loading images...'}</div>
        ) : refImages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📷</div>
            <p style={{ fontSize: '0.875rem' }}>{locale === 'vi' ? 'Chưa có ảnh tham chiếu. Thêm ảnh để phân tích hoặc phân tích lại style.' : 'No reference images yet. Add images to analyze or re-analyze the style.'}</p>
            <label className="btn btn-sm btn-primary" style={{ marginTop: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              ➕ {locale === 'vi' ? 'Thêm ảnh mẫu' : 'Add Images'}
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => handleAddImages(e.target.files)} />
            </label>
          </div>
        ) : (
          <div className="image-gallery">
            {refImages.map((img, i) => (
              <div key={i} className="image-thumb" style={{ position: 'relative' }}>
                <img src={img} alt={`Reference ${i + 1}`} />
                <button
                  className="image-thumb-remove"
                  style={{ opacity: 1, position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={(e) => { e.stopPropagation(); handleDeleteRefImage(i); }}
                >×</button>
                <div style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '0.6rem', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '1px 4px', borderRadius: '3px' }}>{i + 1}</div>
              </div>
            ))}
          </div>
        )}

        {reanalyzing && (
          <div className="analysis-progress" style={{ marginTop: '12px' }}>
            <div className="loading-bar"></div>
            <p style={{ marginTop: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {locale === 'vi' ? '🤖 AI đang phân tích lại từ ảnh tham chiếu...' : '🤖 AI is re-analyzing from reference images...'}
            </p>
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>{L('edit_tab_editor')}</button>
        <button className={`tab ${activeTab === 'output' ? 'active' : ''}`} onClick={() => setActiveTab('output')}>{L('edit_tab_output')}</button>
        <button className={`tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>{L('edit_tab_json')}</button>
        <button className={`tab ${activeTab === 'images' ? 'active' : ''}`} onClick={() => setActiveTab('images')}>🖼️ {locale === 'vi' ? 'Ảnh Đã Giả lập' : 'Generated'}</button>
      </div>

      {activeTab === 'editor' && (
        <div className="two-col-layout">
          <div className="main-col">
            <div className="card" style={{ marginBottom: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{L('edit_subject_type')}</label>
                <select className="form-select" value={prompt.subject_type}
                  onChange={(e) => setPrompt(prev => ({ ...prev, subject_type: e.target.value as PromptSchema['subject_type'] }))}>
                  {subjectTypes.map(st => (<option key={st.value} value={st.value}>{st.label}</option>))}
                </select>
              </div>
            </div>

            {/* Style / Subject sub-filter */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              <button className={`btn btn-sm ${editorFilter === 'all' ? 'btn-primary' : ''}`}
                onClick={() => setEditorFilter('all')} style={{ fontSize: '0.8125rem' }}>
                {locale === 'vi' ? 'Tất cả' : 'All'}
              </button>
              <button className={`btn btn-sm ${editorFilter === 'style' ? 'btn-primary' : ''}`}
                onClick={() => setEditorFilter('style')} style={{ fontSize: '0.8125rem' }}>
                🎨 {locale === 'vi' ? 'Style' : 'Style'} ({STYLE_GROUPS.length})
              </button>
              <button className={`btn btn-sm ${editorFilter === 'subject' ? 'btn-primary' : ''}`}
                onClick={() => setEditorFilter('subject')} style={{ fontSize: '0.8125rem' }}>
                🧩 {locale === 'vi' ? 'Chủ thể' : 'Subject'} ({SUBJECT_GROUPS.length})
              </button>
            </div>

            {PROMPT_GROUPS.map((group) => {
              if (group.condition && !group.condition(prompt)) return null;

              // Filter by Style/Subject category
              const category = getGroupCategory(group.key as keyof PromptSchema);
              if (editorFilter === 'style' && category !== 'style') return null;
              if (editorFilter === 'subject' && category !== 'subject') return null;

              const groupData = (prompt as unknown as Record<string, Record<string, unknown>>)[group.key] as Record<string, unknown> | null;
              if (!groupData) return null;

              const isOpen = openGroups[group.key] ?? false;
              const filledCount = Object.entries(groupData).filter(([k, v]) => {
                if (k.startsWith('_')) return false;
                if (v === null || v === undefined || v === '') return false;
                if (Array.isArray(v) && v.length === 0) return false;
                return true;
              }).length;

              // Localized group label
              const localizedGroup = getGroupLabel(locale, group.key);
              const groupLabel = localizedGroup.label || group.label;
              const groupDesc = localizedGroup.description || group.description;

              return (
                <div key={group.key} className="section-group">
                  <div className="section-header" onClick={() => toggleGroup(group.key)}>
                    <span className="section-icon">{group.icon}</span>
                    <div className="section-info">
                      <div className="section-label">
                        {groupLabel}
                        <span style={{
                          fontSize: '0.625rem', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', marginLeft: '8px',
                          background: category === 'style' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                          color: category === 'style' ? 'rgb(167,139,250)' : 'rgb(96,165,250)',
                        }}>
                          {category === 'style' ? '🎨 STYLE' : '🧩 SUBJECT'}
                        </span>
                        {filledCount > 0 && (<span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginLeft: '8px', fontWeight: 400 }}>{filledCount} {L('edit_fields')}</span>)}
                      </div>
                      <div className="section-desc">{groupDesc}</div>
                    </div>
                    <span className={`section-toggle ${isOpen ? 'open' : ''}`}>▼</span>
                  </div>
                  <div className={`section-body ${isOpen ? '' : 'hidden'}`}>
                    {group.fields.map((field) => {
                      const locField = getFieldLabel(locale, group.key, field.key);
                      return (
                        <FieldInput
                          key={field.key}
                          field={{
                            ...field,
                            label: locField.label || field.label,
                            description: locField.description || field.description,
                            placeholder: locField.placeholder || field.placeholder,
                          }}
                          locale={locale}
                          value={(groupData[field.key] as string | string[] | number | null) ?? (field.type === 'tags' ? [] : null)}
                          onChange={(val) => updateField(group.key, field.key, val)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="side-col">
            <div className="card" style={{ position: 'sticky', top: '24px' }}>
              <div className="card-header">
                <h3 className="card-title">{L('edit_live_preview')}</h3>
                <button className="btn btn-sm" onClick={() => handleCopy(jsonPromptStr)}>{L('edit_copy')}</button>
              </div>
              <pre className="prompt-output" style={{ maxHeight: '60vh', overflow: 'auto', fontSize: '0.8125rem' }}>
                {jsonPromptStr || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{L('edit_fill_fields')}</span>}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'output' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{L('edit_json_prompt')}</h3>
              <button className="btn btn-sm btn-primary" onClick={() => handleCopy(jsonPromptStr)}>{L('edit_copy_json')}</button>
            </div>
            <pre className="prompt-output" style={{ fontSize: '0.9375rem', lineHeight: '1.7', maxHeight: '70vh', overflow: 'auto' }}>
              {jsonPromptStr || L('edit_no_content')}
            </pre>
          </div>
          <div className="card" style={{ marginTop: '16px' }}>
            <div className="card-header">
              <h3 className="card-title">📝 Text Prompt</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-sm btn-success" onClick={() => handleCopy(flattened.positive)}>📋 {L('edit_positive')}</button>
                {flattened.negative && <button className="btn btn-sm btn-danger" onClick={() => handleCopy(flattened.negative)}>📋 {L('edit_negative')}</button>}
              </div>
            </div>
            <div className="prompt-output">
              <div className="prompt-output-label">✅ {L('edit_positive')}</div>
              <div className="prompt-output-positive" style={{ fontSize: '0.9375rem' }}>{flattened.positive || L('edit_no_content')}</div>
              {flattened.negative && (<><div className="prompt-output-label" style={{ marginTop: '20px' }}>🚫 {L('edit_negative')}</div><div className="prompt-output-negative" style={{ fontSize: '0.9375rem' }}>{flattened.negative}</div></>)}
            </div>
          </div>
          {prompt.generation_params && (
            <div className="card" style={{ marginTop: '16px' }}>
              <div className="card-header"><h3 className="card-title">{L('edit_gen_params')}</h3></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {Object.entries(prompt.generation_params).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  const locField = getFieldLabel(locale, 'generation_params', key);
                  const label = locField.label || key.replace(/_/g, ' ');
                  return (
                    <div key={key} style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{String(value)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      
      {activeTab === 'images' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{locale === 'vi' ? 'Ảnh Đã Tạo Gần Đây' : 'Recently Generated Images'}</h3>
          </div>
          {genImages.length === 0 ? (
             <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
               {locale === 'vi' ? 'Chưa có ảnh nào được tạo cho style này' : 'No images generated for this style yet'}
             </div>
          ) : (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
               {genImages.map(img => (
                 <div key={img.id} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                   <div style={{ width: '100%', aspectRatio: img.aspect_ratio ? img.aspect_ratio.replace(':', '/') : '1/1', background: '#000' }}>
                     <img src={img.data} alt="Gen" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                   </div>
                   <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>Prompt:</div>
                        <div style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                           {img.prompt_text}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {new Date(img.created_at).toLocaleDateString()}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm" onClick={() => handleDeleteGenImage(img.id)} title="Delete">🗑️</button>
                        </div>
                      </div>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      )}

      {activeTab === 'json' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{L('edit_raw_json')}</h3>
            <button className="btn btn-sm" onClick={() => handleCopy(JSON.stringify(prompt, null, 2))}>📋 {L('edit_copy')}</button>
          </div>
          <pre className="prompt-output" style={{ maxHeight: '70vh', overflow: 'auto' }}>{JSON.stringify(prompt, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Field Input Component
// ============================================================

