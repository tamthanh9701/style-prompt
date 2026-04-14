import { createEmptyPrompt, getGroupCategory } from '@/types';
import React, { useState, useEffect, useRef } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { type Locale, t, getGroupLabel, getFieldLabel } from '@/lib/i18n';
import { callAI, fileToBase64 } from '@/lib/storage';
import { PROMPT_GROUPS, STYLE_GROUPS } from '@/types';
import FieldInput from '@/app/components/FieldInput';

// ============================================================
// Edit Style View (Prompt Editor) — with localized field labels

export default function ImageEditView({ style, styles, settings, locale, onBack, showToast }: {
  style?: StyleLibrary;
  styles: StyleLibrary[];
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  // Pre-load from style if coming from library
  const preloadedImage = style?.reference_images?.[0] || '';
  const preloadedAnalysis = style ? style.prompt : null;

  const [sourceImage, setSourceImage] = useState<string>(preloadedImage);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [originalAnalysis, setOriginalAnalysis] = useState<PromptSchema | null>(preloadedAnalysis);
  const [editedPrompt, setEditedPrompt] = useState<PromptSchema | null>(preloadedAnalysis ? JSON.parse(JSON.stringify(preloadedAnalysis)) : null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(preloadedAnalysis ? { subject: true, lighting: true, color_palette: true } : {});
  const [editorFilter, setEditorFilter] = useState<'all' | 'style' | 'subject'>('all');
  const [editInstructions, setEditInstructions] = useState('');
  const [intensity, setIntensity] = useState<'light' | 'medium' | 'strong'>('medium');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [selectedRefImage, setSelectedRefImage] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editResult, setEditResult] = useState<any>(null);
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  const activeStyles = styles.filter(s => (s.status || 'active') === 'active');

  // When user selects a different reference image from the style
  const handleSelectRefImage = (index: number) => {
    if (!style?.reference_images?.[index]) return;
    setSelectedRefImage(index);
    setSourceImage(style.reference_images[index]);
  };

  const handleUpload = async (files: FileList | File[]) => {
    const file = Array.from(files).find(f => f.type.startsWith('image/'));
    if (!file) return;
    const base64 = await fileToBase64(file);
    setSourceImage(base64);
    setOriginalAnalysis(null);
    setEditedPrompt(null);
    setEditResult(null);
    setEditInstructions('');
  };

  const handleAnalyze = async () => {
    if (!sourceImage) { showToast(L('edit_img_upload_warning'), 'warning'); return; }
    setAnalyzing(true);
    setOriginalAnalysis(null);
    setEditedPrompt(null);
    setEditResult(null);
    try {
      const result = await callAI(settings, 'analyzeForEdit', [sourceImage]);
      const prompt: PromptSchema = {
        ...createEmptyPrompt(result.style_name || 'Image Analysis'),
        ...result,
      };
      setOriginalAnalysis(prompt);
      setEditedPrompt(JSON.parse(JSON.stringify(prompt)));
      // Open first few groups by default
      setOpenGroups({ subject: true, lighting: true, color_palette: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Analysis failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const updateField = (groupKey: string, fieldKey: string, value: string | string[] | number | null) => {
    if (!editedPrompt) return;
    setEditedPrompt(prev => {
      if (!prev) return prev;
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

  const resetField = (groupKey: string, fieldKey: string) => {
    if (!originalAnalysis || !editedPrompt) return;
    const originalValue = (originalAnalysis as unknown as Record<string, Record<string, unknown>>)[groupKey]?.[fieldKey];
    updateField(groupKey, fieldKey, originalValue as string | string[] | number | null);
  };

  const resetAll = () => {
    if (!originalAnalysis) return;
    setEditedPrompt(JSON.parse(JSON.stringify(originalAnalysis)));
  };

  // Count changes between original and edited
  const getChanges = (): Array<{ group: string; field: string; from: unknown; to: unknown }> => {
    if (!originalAnalysis || !editedPrompt) return [];
    const changes: Array<{ group: string; field: string; from: unknown; to: unknown }> = [];
    for (const group of PROMPT_GROUPS) {
      const origGroup = (originalAnalysis as unknown as Record<string, Record<string, unknown>>)[group.key];
      const editGroup = (editedPrompt as unknown as Record<string, Record<string, unknown>>)[group.key];
      if (!origGroup || !editGroup) continue;
      for (const field of group.fields) {
        const origVal = origGroup[field.key];
        const editVal = editGroup[field.key];
        const origStr = JSON.stringify(origVal);
        const editStr = JSON.stringify(editVal);
        if (origStr !== editStr) {
          changes.push({ group: group.key, field: field.key, from: origVal, to: editVal });
        }
      }
    }
    return changes;
  };

  const changes = getChanges();

  const handleGenerate = async () => {
    if (!originalAnalysis || !editedPrompt) return;
    if (changes.length === 0 && !editInstructions.trim()) {
      showToast(L('edit_img_no_changes'), 'warning');
      return;
    }
    setGenerating(true);
    setEditResult(null);
    try {
      // Build diff of changes
      const changeDiff = changes.map(c => ({
        group: c.group,
        field: c.field,
        original: c.from,
        modified: c.to,
      }));

      // Optionally include style profile
      let styleOverride = null;
      if (selectedStyleId) {
        const selectedStyle = styles.find(s => s.id === selectedStyleId);
        if (selectedStyle) {
          const styleData: Record<string, unknown> = {};
          for (const gk of STYLE_GROUPS) {
            const gv = (selectedStyle.prompt as unknown as Record<string, unknown>)[gk as string];
            if (gv) styleData[gk as string] = gv;
          }
          styleOverride = { style_name: selectedStyle.name, ...styleData };
        }
      }

      const context = {
        original_analysis: originalAnalysis,
        changes: changeDiff,
        intensity,
        user_instructions: editInstructions.trim() || null,
        style_override: styleOverride,
      };

      const result = await callAI(settings, 'generateEditPrompt', [sourceImage], {
        prompt_context: JSON.stringify(context, null, 2),
      });
      setEditResult(result);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); showToast(L('edit_copied')); } catch { showToast(L('edit_copy_failed'), 'error'); }
  };

  const isFieldChanged = (groupKey: string, fieldKey: string): boolean => {
    if (!originalAnalysis || !editedPrompt) return false;
    const origVal = (originalAnalysis as unknown as Record<string, Record<string, unknown>>)[groupKey]?.[fieldKey];
    const editVal = (editedPrompt as unknown as Record<string, Record<string, unknown>>)[groupKey]?.[fieldKey];
    return JSON.stringify(origVal) !== JSON.stringify(editVal);
  };

  const intensityColors: Record<string, string> = {
    light: 'rgba(6,182,212,0.15)',
    medium: 'rgba(245,158,11,0.15)',
    strong: 'rgba(239,68,68,0.15)',
  };
  const intensityBorder: Record<string, string> = {
    light: 'rgb(6,182,212)',
    medium: 'rgb(245,158,11)',
    strong: 'rgb(239,68,68)',
  };

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_library')}</a>
      <div className="page-header">
        <h1 className="page-title">{L('edit_img_title')}{style ? ` — ${style.name}` : ''}</h1>
        <p className="page-subtitle">{style ? (locale === 'vi' ? 'Chỉnh sửa thông số từ style đã phân tích → Sinh prompt chỉnh sửa' : 'Edit parameters from analyzed style → Generate edit prompt') : L('edit_img_subtitle')}</p>
      </div>

      {/* Step 1: Upload Image */}
      {!originalAnalysis && !analyzing && (
        <div>
          <div className="comparison-container" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="comparison-panel">
              <div className="comparison-panel-header">📷 {locale === 'vi' ? 'Ảnh cần chỉnh sửa' : 'Image to Edit'}</div>
              <div className="comparison-panel-body">
                {sourceImage ? (
                  <div style={{ position: 'relative' }}>
                    <img src={sourceImage} alt="Source" style={{ width: '100%', borderRadius: 'var(--radius-sm)' }} />
                    <button className="btn btn-sm" style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                      onClick={() => { setSourceImage(''); }}>✕</button>
                  </div>
                ) : (
                  <div className={`upload-zone ${dragOver ? 'dragover' : ''}`} style={{ padding: '50px 16px' }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
                    onClick={() => document.getElementById('edit-file-input')?.click()}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✏️</div>
                    <div className="upload-zone-title">{L('edit_img_upload_title')}</div>
                    <div className="upload-zone-desc">{L('edit_img_upload_desc')}</div>
                    <input id="edit-file-input" type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => e.target.files && handleUpload(e.target.files)} />
                  </div>
                )}
              </div>
            </div>
            <div className="comparison-panel">
              <div className="comparison-panel-header">{L('edit_img_instructions_label')}</div>
              <div className="comparison-panel-body" style={{ padding: '16px' }}>
                <textarea
                  className="form-textarea"
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  rows={5}
                  placeholder={L('edit_img_instructions_placeholder')}
                  style={{ marginBottom: '16px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={!sourceImage}>
                    {L('edit_img_analyze_btn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing progress */}
      {analyzing && (
        <div className="analysis-progress slide-in" style={{ marginTop: '24px' }}>
          <div className="loading-bar"></div>
          <h3 className="analysis-progress-title" style={{ marginTop: '16px' }}>{L('edit_img_analyzing_title')}</h3>
          <p className="analysis-progress-desc">{L('edit_img_analyzing_desc')}</p>
        </div>
      )}

      {/* Step 2: Edit Parameters */}
      {originalAnalysis && editedPrompt && !editResult && !generating && (
        <div className="slide-in">
          {/* Source image thumbnail + style info + change counter + controls */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Reference images from library or single source image + upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('edit-file-input-step2')?.click()}>
                <img src={sourceImage} alt="Source" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '2px solid var(--accent-primary)' }} />
                <div style={{
                  position: 'absolute', bottom: '0', left: '0', right: '0', padding: '4px',
                  background: 'rgba(0,0,0,0.7)', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                  fontSize: '0.625rem', color: '#fff', textAlign: 'center',
                }}>
                  📷 {locale === 'vi' ? 'Nhấn để đổi ảnh' : 'Click to change'}
                </div>
              </div>
              <input id="edit-file-input-step2" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) {
                    const file = Array.from(e.target.files).find(f => f.type.startsWith('image/'));
                    if (file) fileToBase64(file).then(base64 => setSourceImage(base64));
                  }
                }} />
              {style && style.reference_images.length > 1 && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  {style.reference_images.map((img, i) => (
                    <img key={i} src={img} alt={`Ref ${i + 1}`}
                      onClick={() => handleSelectRefImage(i)}
                      style={{
                        width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer',
                        border: selectedRefImage === i ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)',
                        opacity: selectedRefImage === i ? 1 : 0.6,
                      }} />
                  ))}
                </div>
              )}
              {style && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, textAlign: 'center' }}>
                  {style.name} v{style.version || 1}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              {/* Intensity slider */}
              <div className="card" style={{ padding: '14px 16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{L('edit_img_intensity')}:</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['light', 'medium', 'strong'] as const).map(level => (
                      <button key={level}
                        className={`btn btn-sm ${intensity === level ? '' : ''}`}
                        onClick={() => setIntensity(level)}
                        style={{
                          background: intensity === level ? intensityColors[level] : 'transparent',
                          border: `2px solid ${intensity === level ? intensityBorder[level] : 'var(--border-subtle)'}`,
                          color: intensity === level ? intensityBorder[level] : 'var(--text-secondary)',
                          fontWeight: intensity === level ? 700 : 400,
                          padding: '5px 14px',
                        }}>
                        {level === 'light' ? L('edit_img_intensity_light') : level === 'medium' ? L('edit_img_intensity_medium') : L('edit_img_intensity_strong')}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 700,
                      background: changes.length > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(100,100,100,0.12)',
                      color: changes.length > 0 ? 'var(--accent-warning)' : 'var(--text-muted)',
                    }}>
                      {changes.length} {L('edit_img_changes_count')}
                    </span>
                    {changes.length > 0 && (
                      <button className="btn btn-sm" onClick={resetAll} style={{ fontSize: '0.75rem' }}>
                        {L('edit_img_reset_all')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Style library select */}
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>🎨 {L('edit_img_apply_style')}:</span>
                  <select className="form-select" value={selectedStyleId} onChange={(e) => setSelectedStyleId(e.target.value)} style={{ flex: 1, maxWidth: '350px' }}>
                    <option value="">{L('edit_img_no_style')}</option>
                    {activeStyles.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (v{s.version})</option>
                    ))}
                  </select>
                  {!selectedStyleId && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{L('edit_img_style_hint')}</span>}
                </div>
              </div>

              {/* Edit instructions — always editable */}
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>{L('edit_img_instructions_label')}</label>
                <textarea
                  className="form-textarea"
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  rows={2}
                  placeholder={L('edit_img_instructions_placeholder')}
                  style={{ fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>

          {/* Style / Subject filter */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <button className={`btn btn-sm ${editorFilter === 'all' ? 'btn-primary' : ''}`} onClick={() => setEditorFilter('all')} style={{ fontSize: '0.8125rem' }}>
              {locale === 'vi' ? 'Tất cả' : 'All'}
            </button>
            <button className={`btn btn-sm ${editorFilter === 'style' ? 'btn-primary' : ''}`} onClick={() => setEditorFilter('style')} style={{ fontSize: '0.8125rem' }}>
              🎨 Style
            </button>
            <button className={`btn btn-sm ${editorFilter === 'subject' ? 'btn-primary' : ''}`} onClick={() => setEditorFilter('subject')} style={{ fontSize: '0.8125rem' }}>
              🧩 {locale === 'vi' ? 'Chủ thể' : 'Subject'}
            </button>
          </div>

          {/* Parameter editor groups */}
          {PROMPT_GROUPS.map((group) => {
            if (group.condition && !group.condition(editedPrompt)) return null;
            const category = getGroupCategory(group.key as keyof PromptSchema);
            if (editorFilter === 'style' && category !== 'style') return null;
            if (editorFilter === 'subject' && category !== 'subject') return null;

            const groupData = (editedPrompt as unknown as Record<string, Record<string, unknown>>)[group.key] as Record<string, unknown> | null;
            if (!groupData) return null;
            const isOpen = openGroups[group.key] ?? false;

            // Count changed fields in this group
            const changedCount = group.fields.filter(f => isFieldChanged(group.key, f.key)).length;
            const filledCount = Object.entries(groupData).filter(([k, v]) => {
              if (k.startsWith('_')) return false;
              if (v === null || v === undefined || v === '') return false;
              if (Array.isArray(v) && v.length === 0) return false;
              return true;
            }).length;

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
                      {changedCount > 0 && (<span style={{ fontSize: '0.75rem', color: 'var(--accent-warning)', marginLeft: '8px', fontWeight: 700 }}>✏️ {changedCount} {L('edit_img_changes_count')}</span>)}
                    </div>
                    <div className="section-desc">{groupDesc}</div>
                  </div>
                  <span className={`section-toggle ${isOpen ? 'open' : ''}`}>▼</span>
                </div>
                <div className={`section-body ${isOpen ? '' : 'hidden'}`}>
                  {group.fields.map((field) => {
                    const locField = getFieldLabel(locale, group.key, field.key);
                    const changed = isFieldChanged(group.key, field.key);
                    const origVal = originalAnalysis ? (originalAnalysis as unknown as Record<string, Record<string, unknown>>)[group.key]?.[field.key] : null;

                    return (
                      <div key={field.key} style={{ position: 'relative' }}>
                        {/* Change indicator */}
                        {changed && (
                          <div style={{
                            position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px', alignItems: 'center', zIndex: 1,
                          }}>
                            <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', color: 'var(--accent-warning)', fontWeight: 700 }}>
                              ✏️ {L('edit_img_modified')}
                            </span>
                            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); resetField(group.key, field.key); }}
                              style={{ padding: '2px 6px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              {L('edit_img_reset_field')}
                            </button>
                          </div>
                        )}
                        <div style={{ borderLeft: changed ? '3px solid var(--accent-warning)' : '3px solid transparent', paddingLeft: '8px', transition: 'border-color 0.2s' }}>
                          {/* Show original value when changed */}
                          {changed && origVal !== null && origVal !== undefined && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '-4px', marginTop: '4px', paddingLeft: '2px' }}>
                              <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>
                                {L('edit_img_original')}: {Array.isArray(origVal) ? (origVal as string[]).join(', ') : String(origVal).substring(0, 80)}
                              </span>
                            </div>
                          )}
                          <FieldInput
                            field={{
                              ...field,
                              label: locField.label || field.label,
                              description: locField.description || field.description,
                              placeholder: locField.placeholder || field.placeholder,
                            }}
                            locale={locale}
                            value={(groupData[field.key] as string | string[] | number | null) ?? (field.type === 'tags' ? [] : null)}
                            onChange={(val: string | string[] | number | null) => updateField(group.key, field.key, val)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Generate button */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={changes.length === 0 && !editInstructions.trim()}>
              {L('edit_img_generate_btn')} {changes.length > 0 && `(${changes.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Generating progress */}
      {generating && (
        <div className="analysis-progress slide-in" style={{ marginTop: '24px' }}>
          <div className="loading-bar"></div>
          <h3 className="analysis-progress-title" style={{ marginTop: '16px' }}>{L('edit_img_generating')}</h3>
        </div>
      )}

      {/* Step 3: Result */}
      {editResult && (
        <div className="slide-in" style={{ marginTop: '24px' }}>
          {/* Summary */}
          {editResult.edit_summary && (
            <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.08)', borderLeft: '4px solid var(--accent-success)', marginBottom: '16px', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent-success)' }}>📝</strong> {editResult.edit_summary}
            </div>
          )}

          {/* Main prompt */}
          <div className="card" style={{ border: '1px solid var(--accent-success)', background: 'rgba(16,185,129,0.03)' }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: 'var(--accent-success)' }}>{L('edit_img_result_title')}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-sm btn-primary" onClick={() => handleCopy(editResult.full_prompt || '')}>{L('edit_img_copy_prompt')}</button>
                {editResult.negative_prompt && (
                  <button className="btn btn-sm" onClick={() => handleCopy(editResult.negative_prompt)}>{L('edit_img_copy_negative')}</button>
                )}
                <button className="btn btn-sm" onClick={() => { setEditResult(null); setEditedPrompt(JSON.parse(JSON.stringify(originalAnalysis))); }}>
                  {L('edit_img_new_edit')}
                </button>
              </div>
            </div>

            {/* Positive prompt */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>✅ Prompt</div>
              <pre className="prompt-output" style={{ fontSize: '0.9375rem', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {editResult.full_prompt || ''}
              </pre>
            </div>

            {/* Negative prompt */}
            {editResult.negative_prompt && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>🚫 Negative</div>
                <pre className="prompt-output" style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                  {editResult.negative_prompt}
                </pre>
              </div>
            )}

            {/* Metadata: denoising + workflow */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
              {editResult.suggested_strength !== undefined && (
                <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{L('edit_img_denoising')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{editResult.suggested_strength}</div>
                </div>
              )}
              {editResult.workflow_hint && (
                <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-secondary)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{L('edit_img_workflow')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{editResult.workflow_hint}</div>
                </div>
              )}
              <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${intensityBorder[intensity]}` }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{L('edit_img_intensity')}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: intensityBorder[intensity] }}>
                  {intensity === 'light' ? L('edit_img_intensity_light') : intensity === 'medium' ? L('edit_img_intensity_medium') : L('edit_img_intensity_strong')}
                </div>
              </div>
            </div>

            {/* Change details */}
            {editResult.change_details && editResult.change_details.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  📋 {locale === 'vi' ? 'Chi tiết thay đổi' : 'Change Details'} ({editResult.change_details.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {editResult.change_details.map((cd: any, i: number) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${cd.impact === 'major' ? 'var(--accent-danger)' : cd.impact === 'moderate' ? 'var(--accent-warning)' : 'var(--accent-secondary)'}` }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{cd.field}</div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{cd.from}</span>
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                        <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>{cd.to}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
