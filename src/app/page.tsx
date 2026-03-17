'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { createEmptyPrompt, flattenPrompt, generateJsonPrompt, PROMPT_GROUPS, STYLE_GROUPS, SUBJECT_GROUPS, getGroupCategory } from '@/types';
import { getStyles, addStyle, updateStyle, deleteStyle, getSettings, saveSettings, fileToBase64, generateId, callAI } from '@/lib/storage';
import { type Locale, getLocale, setLocale as persistLocale, t, getGroupLabel, getFieldLabel } from '@/lib/i18n';

// ============================================================
// Main App Component
// ============================================================

type View = 'library' | 'create' | 'edit' | 'compare' | 'generate' | 'settings' | 'logs';

export default function HomePage() {
  const [view, setView] = useState<View>('library');
  const [styles, setStyles] = useState<StyleLibrary[]>([]);
  const [settings, setSettingsState] = useState<AppSettings | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [locale, setLocaleState] = useState<Locale>('vi');

  useEffect(() => {
    setStyles(getStyles());
    setSettingsState(getSettings());
    setLocaleState(getLocale());
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    persistLocale(newLocale);
  };

  const selectedStyle = styles.find(s => s.id === selectedStyleId);
  const refreshStyles = () => setStyles(getStyles());
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  const handleCreateStyle = (style: StyleLibrary) => {
    addStyle(style);
    refreshStyles();
    setSelectedStyleId(style.id);
    setView('edit');
    showToast(L('style_created'));
  };

  const handleUpdateStyle = (id: string, updates: Partial<StyleLibrary>) => {
    updateStyle(id, updates);
    refreshStyles();
  };

  const handleDeleteStyle = (id: string) => {
    deleteStyle(id);
    refreshStyles();
    setView('library');
    showToast(L('style_deleted'));
  };

  const handleSettingsSave = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettingsState(newSettings);
    showToast(L('settings_saved'));
  };

  if (!settings) return null;

  return (
    <>
      {/* Navigation */}
      <nav className="nav-header">
        <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); setView('library'); }}>
          <div className="nav-logo-icon">🎨</div>
          <span className="nav-logo-text">{L('nav_title')}</span>
        </a>
        <div className="nav-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
            <button className={`btn btn-sm ${locale === 'vi' ? 'btn-primary' : ''}`} onClick={() => switchLocale('vi')} style={{ padding: '4px 10px', fontSize: '0.8125rem' }}>🇻🇳 VI</button>
            <button className={`btn btn-sm ${locale === 'en' ? 'btn-primary' : ''}`} onClick={() => switchLocale('en')} style={{ padding: '4px 10px', fontSize: '0.8125rem' }}>🇺🇸 EN</button>
          </div>
          <button className="btn btn-sm" onClick={() => setView('logs')}>📋 {locale === 'vi' ? 'Logs' : 'Logs'}</button>
          <button className="btn btn-sm" onClick={() => setView('settings')}>{L('nav_settings')}</button>
          <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>{L('nav_new_style')}</button>
        </div>
      </nav>

      <div className="fade-in">
        {view === 'library' && <LibraryView styles={styles} locale={locale} onSelect={(id) => { setSelectedStyleId(id); setView('edit'); }} onCreate={() => setView('create')} onDelete={handleDeleteStyle} />}
        {view === 'create' && <CreateStyleView settings={settings} locale={locale} onBack={() => setView('library')} onCreate={handleCreateStyle} showToast={showToast} />}
        {view === 'edit' && selectedStyle && <EditStyleView style={selectedStyle} settings={settings} locale={locale} onBack={() => setView('library')} onUpdate={handleUpdateStyle} onCompare={() => setView('compare')} onGenerate={() => setView('generate')} showToast={showToast} />}
        {view === 'compare' && selectedStyle && <CompareView style={selectedStyle} settings={settings} locale={locale} onBack={() => setView('edit')} onUpdate={handleUpdateStyle} showToast={showToast} />}
        {view === 'generate' && selectedStyle && <GenerateView style={selectedStyle} settings={settings} locale={locale} onBack={() => setView('edit')} onUpdate={handleUpdateStyle} showToast={showToast} />}
        {view === 'logs' && <LogsView locale={locale} onBack={() => setView('library')} />}
        {view === 'settings' && <SettingsView settings={settings} locale={locale} onBack={() => setView('library')} onSave={handleSettingsSave} showToast={showToast} />}
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' && '✓'} {toast.type === 'error' && '✗'} {toast.type === 'warning' && '⚠'} {toast.message}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// Library View
// ============================================================

function LibraryView({ styles, locale, onSelect, onCreate, onDelete }: {
  styles: StyleLibrary[];
  locale: Locale;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{L('lib_title')}</h1><p className="page-subtitle">{L('lib_subtitle')}</p></div>
      {styles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <h2 className="empty-state-title">{L('lib_empty_title')}</h2>
          <p className="empty-state-desc">{L('lib_empty_desc')}</p>
          <button className="btn btn-primary btn-lg" onClick={onCreate}>{L('lib_empty_btn')}</button>
        </div>
      ) : (
        <div className="styles-grid">
          {styles.map((style) => (
            <div key={style.id} className="style-card" onClick={() => onSelect(style.id)}>
              <div className="style-card-images">
                {style.reference_images.slice(0, 3).map((img, i) => (<img key={i} src={img} alt={`${style.name} ref ${i + 1}`} />))}
                {style.reference_images.length === 0 && (<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No images</div>)}
              </div>
              <div className="style-card-body">
                <div className="style-card-name">{style.name}</div>
                <div className="style-card-meta">
                  <span className="style-card-badge">{style.prompt.subject_type}</span>
                  <span>{style.reference_images.length} {L('lib_images')}</span>
                  <span>{new Date(style.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Create Style View — with analysis result summary
// ============================================================

function CreateStyleView({ settings, locale, onBack, onCreate, showToast }: {
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onCreate: (style: StyleLibrary) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [styleName, setStyleName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ style: StyleLibrary; fieldCount: number } | null>(null);
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const base64s = await Promise.all(fileArray.map(fileToBase64));
    setImages(prev => [...prev, ...base64s]);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };

  const handleAnalyze = async () => {
    if (images.length === 0) { showToast(L('create_upload_warning'), 'warning'); return; }
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await callAI(settings, 'analyzeStyle', images);
      const prompt: PromptSchema = {
        ...createEmptyPrompt(styleName || result.style_name || 'Untitled Style'),
        ...result,
        style_name: styleName || result.style_name || 'Untitled Style',
      };

      // Count filled fields
      let fieldCount = 0;
      for (const [key, value] of Object.entries(prompt)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          for (const [, fv] of Object.entries(value as Record<string, unknown>)) {
            if (fv !== null && fv !== undefined && fv !== '') {
              if (Array.isArray(fv) && fv.length === 0) continue;
              fieldCount++;
            }
          }
        }
      }

      const style: StyleLibrary = {
        id: generateId(),
        name: prompt.style_name,
        description: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reference_images: images,
        prompt,
        prompt_history: [prompt],
        generated_images: [],
      };

      setAnalysisResult({ style, fieldCount });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Analysis failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcceptResult = () => {
    if (analysisResult) {
      onCreate(analysisResult.style);
    }
  };

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_library')}</a>
      <div className="page-header"><h1 className="page-title">{L('create_title')}</h1><p className="page-subtitle">{L('create_subtitle')}</p></div>

      <div className="form-group">
        <label className="form-label">{L('create_style_name')}</label>
        <input className="form-input" placeholder={L('create_style_name_placeholder')} value={styleName} onChange={(e) => setStyleName(e.target.value)} />
      </div>

      <div className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}>
        <div className="upload-zone-icon">📁</div>
        <div className="upload-zone-title">{L('create_drop_title')}</div>
        <div className="upload-zone-desc">{L('create_drop_desc')}</div>
        <input id="file-input" type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>

      {images.length > 0 && (
        <div className="image-gallery">
          {images.map((img, i) => (
            <div key={i} className="image-thumb"><img src={img} alt={`Upload ${i + 1}`} />
              <button className="image-thumb-remove" onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, idx) => idx !== i)); }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={analyzing || images.length === 0}>
          {analyzing ? <><span className="loading-spinner"></span> {L('create_analyzing')}</> : <>{L('create_analyze_btn')}</>}
        </button>
      </div>

      {analyzing && (
        <div className="analysis-progress slide-in" style={{ marginTop: '24px' }}>
          <div className="loading-bar"></div>
          <h3 className="analysis-progress-title" style={{ marginTop: '16px' }}>{L('create_analyzing_title')}</h3>
          <p className="analysis-progress-desc">{L('create_analyzing_desc')}</p>
        </div>
      )}

      {/* Analysis Result Summary */}
      {analysisResult && (
        <div className="card slide-in" style={{ marginTop: '24px', border: '1px solid var(--accent-success)', background: 'rgba(16,185,129,0.05)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--accent-success)' }}>{L('analysis_complete')}</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              {analysisResult.fieldCount} {L('analysis_fields_detected')}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{L('analysis_summary')}</p>

          {/* Preview detected values by group */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {PROMPT_GROUPS.slice(0, 8).map((group) => {
              const localizedGroup = getGroupLabel(locale, group.key);
              const groupLabel = localizedGroup.label || group.label;
              const groupData = (analysisResult.style.prompt as unknown as Record<string, Record<string, unknown>>)[group.key] as Record<string, unknown> | null;
              if (!groupData) return null;
              const filledFields = Object.entries(groupData).filter(([, v]) => {
                if (v === null || v === undefined || v === '') return false;
                if (Array.isArray(v) && v.length === 0) return false;
                return true;
              });
              if (filledFields.length === 0) return null;
              return (
                <div key={group.key} style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '6px' }}>{group.icon} {groupLabel}</div>
                  {filledFields.slice(0, 3).map(([k, v]) => {
                    const locField = getFieldLabel(locale, group.key, k);
                    const label = locField.label || k.replace(/_/g, ' ');
                    return (
                      <div key={k} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>{label}: </span>
                        <span>{Array.isArray(v) ? v.join(', ') : String(v).substring(0, 60)}{String(v).length > 60 ? '...' : ''}</span>
                      </div>
                    );
                  })}
                  {filledFields.length > 3 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>+{filledFields.length - 3} more...</div>}
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary btn-lg" onClick={handleAcceptResult} style={{ width: '100%' }}>
            {L('analysis_view_edit')}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Edit Style View (Prompt Editor) — with localized field labels
// ============================================================

function EditStyleView({ style, settings, locale, onBack, onUpdate, onCompare, onGenerate, showToast }: {
  style: StyleLibrary;
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<StyleLibrary>) => void;
  onCompare: () => void;
  onGenerate: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [prompt, setPrompt] = useState<PromptSchema>(style.prompt);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ subject: true, artistic_style: true });
  const [activeTab, setActiveTab] = useState<'editor' | 'output' | 'json'>('editor');
  const [editorFilter, setEditorFilter] = useState<'all' | 'style' | 'subject'>('all');
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

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

  const handleSave = () => {
    onUpdate(style.id, { prompt, prompt_history: [...style.prompt_history, prompt], name: prompt.style_name });
    showToast(L('edit_saved'));
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
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_library')}</a>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1 className="page-title">{style.name}</h1><p className="page-subtitle">{L('edit_subtitle')}</p></div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn" onClick={onGenerate}>🖼️ {locale === 'vi' ? 'Tạo Ảnh Mới' : 'New Image'}</button>
          <button className="btn" onClick={onCompare}>{L('edit_improve_btn')}</button>
          <button className="btn btn-primary" onClick={handleSave}>{L('edit_save_btn')}</button>
        </div>
      </div>

      {style.reference_images.length > 0 && (
        <div className="image-gallery" style={{ marginBottom: '24px' }}>
          {style.reference_images.map((img, i) => (<div key={i} className="image-thumb"><img src={img} alt={`Reference ${i + 1}`} /></div>))}
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>{L('edit_tab_editor')}</button>
        <button className={`tab ${activeTab === 'output' ? 'active' : ''}`} onClick={() => setActiveTab('output')}>{L('edit_tab_output')}</button>
        <button className={`tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>{L('edit_tab_json')}</button>
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

function FieldInput({ field, locale, value, onChange }: {
  field: { key: string; label: string; description: string; type: string; options?: string[]; placeholder?: string };
  locale: Locale;
  value: string | string[] | number | null;
  onChange: (val: string | string[] | number | null) => void;
}) {
  const [tagInput, setTagInput] = useState('');

  if (field.type === 'tags') {
    const tags = Array.isArray(value) ? value : [];
    return (
      <div className="form-group">
        <label className="form-label">{field.label}</label>
        <div className="tags-container" onClick={() => document.getElementById(`tag-${field.key}`)?.focus()}>
          {tags.map((tag, i) => (<span key={i} className="tag">{tag}<button className="tag-remove" onClick={() => onChange(tags.filter((_, idx) => idx !== i))}>×</button></span>))}
          <input id={`tag-${field.key}`} className="tags-input" placeholder={tags.length === 0 ? field.placeholder : ''} value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); onChange([...tags, tagInput.trim()]); setTagInput(''); }
              if (e.key === 'Backspace' && !tagInput && tags.length > 0) { onChange(tags.slice(0, -1)); }
            }} />
        </div>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return (<div className="form-group"><label className="form-label">{field.label}</label><textarea className="form-textarea" placeholder={field.placeholder} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} rows={3} /></div>);
  }
  if (field.type === 'number') {
    return (<div className="form-group"><label className="form-label">{field.label}</label><input className="form-input" type="number" placeholder={field.placeholder} value={value !== null && value !== undefined ? String(value) : ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} step="any" /></div>);
  }
  if (field.type === 'select' && field.options) {
    return (<div className="form-group"><label className="form-label">{field.label}</label><select className="form-select" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)}><option value="">{t(locale, 'select_placeholder')}</option>{field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>);
  }
  return (<div className="form-group"><label className="form-label">{field.label}</label><input className="form-input" placeholder={field.placeholder} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} /></div>);
}

// ============================================================
// Compare View — with selectable improvements
// ============================================================

function CompareView({ style, settings, locale, onBack, onUpdate, showToast }: {
  style: StyleLibrary;
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<StyleLibrary>) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [promptText, setPromptText] = useState(flattenPrompt(style.prompt).positive);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<{
    differences: Array<{ category: string; field: string; current_value: string | null; suggested_value: string; severity: string; description: string }>;
    similarity_score: number;
    summary: string;
  } | null>(null);
  const [suggestedPrompt, setSuggestedPrompt] = useState<PromptSchema | null>(null);
  const [selectedDiffs, setSelectedDiffs] = useState<Record<number, boolean>>({});
  const [dragOver, setDragOver] = useState(false);
  const [userFeedback, setUserFeedback] = useState<string>('');
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const base64s = await Promise.all(fileArray.map(fileToBase64));
    setGeneratedImages(prev => [...prev, ...base64s]);
  };

  const handleCompare = async () => {
    if (generatedImages.length === 0) { showToast(L('compare_upload_warning'), 'warning'); return; }
    setComparing(true);
    setComparison(null);
    setSuggestedPrompt(null);
    setSelectedDiffs({});
    try {
      // Step 1: Compare images
      const compResult = await callAI(settings, 'compareImages', generatedImages, {
        prompt_context: JSON.stringify(style.prompt, null, 2),
        reference_images: style.reference_images,
      });
      setComparison(compResult);

      // Select all by default
      const defaultSelected: Record<number, boolean> = {};
      if (compResult.differences) {
        compResult.differences.forEach((_: unknown, i: number) => { defaultSelected[i] = true; });
      }
      setSelectedDiffs(defaultSelected);

      // Step 2: Get suggested improvements (include user feedback if provided)
      const improvementContext: Record<string, unknown> = {
        comparison: compResult,
        current_prompt: style.prompt,
      };
      if (userFeedback.trim()) {
        improvementContext.user_feedback = userFeedback.trim();
      }
      const improved = await callAI(settings, 'suggestImprovements', style.reference_images, {
        prompt_context: JSON.stringify(improvementContext, null, 2),
      });
      setSuggestedPrompt(improved);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Comparison failed', 'error');
    } finally {
      setComparing(false);
    }
  };

  const toggleDiff = (index: number) => {
    setSelectedDiffs(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const selectAllDiffs = () => {
    if (!comparison) return;
    const all: Record<number, boolean> = {};
    comparison.differences.forEach((_, i) => { all[i] = true; });
    setSelectedDiffs(all);
  };

  const handleApplySelected = () => {
    if (!suggestedPrompt || !comparison) return;

    // Build a merged prompt: start from current, apply only selected diff fields from suggested
    const mergedPrompt = JSON.parse(JSON.stringify(style.prompt)) as Record<string, unknown>;
    const suggestedFlat = suggestedPrompt as unknown as Record<string, Record<string, unknown>>;

    comparison.differences.forEach((diff, i) => {
      if (!selectedDiffs[i]) return; // Skip unselected
      const groupKey = diff.category;
      const fieldKey = diff.field;
      if (suggestedFlat[groupKey] && suggestedFlat[groupKey][fieldKey] !== undefined) {
        if (!mergedPrompt[groupKey] || typeof mergedPrompt[groupKey] !== 'object') return;
        (mergedPrompt[groupKey] as Record<string, unknown>)[fieldKey] = suggestedFlat[groupKey][fieldKey];
      }
    });

    const selectedCount = Object.values(selectedDiffs).filter(Boolean).length;
    onUpdate(style.id, {
      prompt: mergedPrompt as unknown as PromptSchema,
      prompt_history: [...style.prompt_history, mergedPrompt as unknown as PromptSchema],
    });
    showToast(`${L('compare_applied')} (${selectedCount}/${comparison.differences.length})`);
    onBack();
  };

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_editor')}</a>
      <div className="page-header">
        <h1 className="page-title">{L('compare_title')} — {style.name}</h1>
        <p className="page-subtitle">{L('compare_subtitle')}</p>
      </div>

      <div className="comparison-container">
        <div className="comparison-panel">
          <div className="comparison-panel-header">{L('compare_ref_images')}</div>
          <div className="comparison-panel-body">
            <div className="image-gallery">
              {style.reference_images.map((img, i) => (<div key={i} className="image-thumb"><img src={img} alt={`Reference ${i + 1}`} /></div>))}
            </div>
          </div>
        </div>
        <div className="comparison-panel">
          <div className="comparison-panel-header">{L('compare_gen_images')}</div>
          <div className="comparison-panel-body">
            <div className={`upload-zone ${dragOver ? 'dragover' : ''}`} style={{ padding: '24px 16px' }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => document.getElementById('gen-file-input')?.click()}>
              <div className="upload-zone-title" style={{ fontSize: '0.875rem' }}>{L('compare_drop_gen')}</div>
              <input id="gen-file-input" type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files && handleFiles(e.target.files)} />
            </div>
            {generatedImages.length > 0 && (
              <div className="image-gallery">
                {generatedImages.map((img, i) => (<div key={i} className="image-thumb"><img src={img} alt={`Generated ${i + 1}`} /><button className="image-thumb-remove"
                  onClick={(e) => { e.stopPropagation(); setGeneratedImages(prev => prev.filter((_, idx) => idx !== i)); }}>✕</button></div>))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header"><h3 className="card-title">{L('compare_prompt_used')}</h3></div>
        <textarea className="form-textarea" value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={4} placeholder={L('compare_prompt_placeholder')} />
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button className="btn btn-primary btn-lg" onClick={handleCompare} disabled={comparing || generatedImages.length === 0}>
          {comparing ? <><span className="loading-spinner"></span> {L('compare_analyzing')}</> : <>{L('compare_btn')}</>}
        </button>
      </div>

      {/* User Feedback — shown after results for re-improvement */}
      {comparison && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3 className="card-title">💬 {locale === 'vi' ? 'Phản hồi của bạn' : 'Your Feedback'}</h3>
          </div>
          <textarea
            className="form-textarea"
            value={userFeedback}
            onChange={(e) => setUserFeedback(e.target.value)}
            rows={3}
            placeholder={locale === 'vi'
              ? 'Nhập phản hồi để cải thiện kết quả, VD: "Tôi muốn màu sắc ấm hơn" hoặc "Ánh sáng cần mềm mại hơn"...'
              : 'Enter feedback to improve results, e.g. "I want warmer colors" or "Lighting needs to be softer"...'}
          />
          {userFeedback.trim() && (
            <div style={{ marginTop: '8px', textAlign: 'right' }}>
              <button className="btn btn-sm btn-primary" onClick={handleCompare} disabled={comparing}>
                {comparing ? <><span className="loading-spinner"></span></> : <>{locale === 'vi' ? '🔄 Phân tích lại với phản hồi' : '🔄 Re-analyze with feedback'}</>}
              </button>
            </div>
          )}
        </div>
      )}

      {comparing && (
        <div className="analysis-progress slide-in" style={{ marginTop: '24px' }}>
          <div className="loading-bar"></div>
          <h3 className="analysis-progress-title" style={{ marginTop: '16px' }}>{L('compare_analyzing_title')}</h3>
          <p className="analysis-progress-desc">{L('compare_analyzing_desc')}</p>
        </div>
      )}

      {/* Comparison Results with Selectable Improvements */}
      {comparison && (
        <div className="slide-in" style={{ marginTop: '24px' }}>
          {/* Summary Card */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <h3 className="card-title">{L('compare_results')}</h3>
              <span style={{
                padding: '4px 16px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.9375rem',
                background: comparison.similarity_score >= 80 ? 'rgba(16,185,129,0.15)' : comparison.similarity_score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                color: comparison.similarity_score >= 80 ? 'var(--accent-success)' : comparison.similarity_score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)',
              }}>
                {comparison.similarity_score}% {L('compare_similarity')}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{comparison.summary}</p>
          </div>

          {/* Differences — Selectable */}
          {comparison.differences && comparison.differences.length > 0 ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">{L('compare_review_title')}</h3>
                <button className="btn btn-sm" onClick={selectAllDiffs}>{L('compare_accept_all')}</button>
              </div>

              {comparison.differences.map((diff, i) => {
                const isSelected = selectedDiffs[i] ?? false;
                const locGroup = getGroupLabel(locale, diff.category);
                const locField = getFieldLabel(locale, diff.category, diff.field);
                const catLabel = locGroup.label || diff.category;
                const fieldLabel = locField.label || diff.field;

                return (
                  <div key={i}
                    onClick={() => toggleDiff(i)}
                    style={{
                      padding: '16px',
                      margin: '8px 0',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      background: isSelected ? 'rgba(99,102,241,0.05)' : 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '4px',
                          border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
                          background: isSelected ? 'var(--accent-primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                        }}>{isSelected ? '✓' : ''}</div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{catLabel} → {fieldLabel}</span>
                      </div>
                      <span style={{
                        padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                        background: diff.severity === 'major' ? 'rgba(239,68,68,0.15)' : diff.severity === 'moderate' ? 'rgba(245,158,11,0.15)' : 'rgba(6,182,212,0.15)',
                        color: diff.severity === 'major' ? 'var(--accent-danger)' : diff.severity === 'moderate' ? 'var(--accent-warning)' : 'var(--accent-secondary)',
                      }}>{diff.severity}</span>
                    </div>

                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>{diff.description}</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.08)', borderLeft: '3px solid var(--accent-danger)' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--accent-danger)', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase' }}>{L('compare_original')}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{diff.current_value || 'null'}</div>
                      </div>
                      <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.08)', borderLeft: '3px solid var(--accent-success)' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--accent-success)', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase' }}>{L('compare_improved')}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{diff.suggested_value}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Apply selected button */}
              {suggestedPrompt && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button className="btn btn-primary btn-lg" onClick={handleApplySelected}
                    disabled={Object.values(selectedDiffs).filter(Boolean).length === 0}>
                    {L('compare_apply_btn')} ({Object.values(selectedDiffs).filter(Boolean).length}/{comparison.differences.length})
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
              <p style={{ color: 'var(--text-secondary)' }}>{L('compare_no_diff')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Generate New Image View
// ============================================================

type VariantField = {
  group: string;
  field: string;
  label_vi: string;
  label_en: string;
  hint_vi: string;
  hint_en: string;
  placeholder_vi: string;
  placeholder_en: string;
  importance: 'required' | 'recommended' | 'optional';
  input_type: 'text' | 'textarea' | 'tags';
};

function GenerateView({ style, settings, locale, onBack, onUpdate, showToast }: {
  style: StyleLibrary;
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<StyleLibrary>) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [styleSummary, setStyleSummary] = useState<string>('');
  const [variantFields, setVariantFields] = useState<VariantField[]>([]);
  const [userValues, setUserValues] = useState<Record<string, string | string[]>>({});
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [resultPrompt, setResultPrompt] = useState<string>('');
  const [detected, setDetected] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  // Load cached fields or auto-detect on mount
  useEffect(() => {
    if (style.cached_variant_fields && style.cached_variant_fields.fields.length > 0) {
      // Use cached results — instant, no AI call needed
      setStyleSummary(style.cached_variant_fields.style_summary);
      setVariantFields(style.cached_variant_fields.fields as VariantField[]);
      setDetected(true);
      setFromCache(true);
    } else {
      handleDetect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDetect = async () => {
    setDetecting(true);
    setDetected(false);
    setResultPrompt('');
    setUserValues({});
    setFromCache(false);
    try {
      const result = await callAI(settings, 'generateVariant', [], {
        prompt_context: JSON.stringify(style.prompt, null, 2),
      });
      setStyleSummary(result.style_summary || '');
      setVariantFields(result.variant_fields || []);
      setDetected(true);

      // Save to cache for next time
      onUpdate(style.id, {
        cached_variant_fields: {
          style_summary: result.style_summary || '',
          fields: result.variant_fields || [],
          detected_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Detection failed', 'error');
    } finally {
      setDetecting(false);
    }
  };

  const setValue = (key: string, val: string | string[]) => {
    setUserValues(prev => ({ ...prev, [key]: val }));
  };

  const fieldKey = (f: VariantField) => `${f.group}__${f.field}`;

  const handleGenerate = async () => {
    // Validate required fields
    const required = variantFields.filter(f => f.importance === 'required');
    const missing = required.filter(f => {
      const v = userValues[fieldKey(f)];
      return !v || (Array.isArray(v) ? v.length === 0 : v.trim() === '');
    });
    if (missing.length > 0) {
      showToast(L('generate_fill_required'), 'warning');
      return;
    }

    // Merge user values into the style prompt
    const variantPrompt = JSON.parse(JSON.stringify(style.prompt)) as Record<string, unknown>;

    variantFields.forEach(f => {
      const val = userValues[fieldKey(f)];
      if (!val || (Array.isArray(val) && val.length === 0) || val === '') return;
      if (!variantPrompt[f.group] || typeof variantPrompt[f.group] !== 'object') return;
      (variantPrompt[f.group] as Record<string, unknown>)[f.field] = val;
    });

    // Generate clean JSON prompt (strip nulls)
    const clean: Record<string, unknown> = {};
    for (const [gk, gv] of Object.entries(variantPrompt)) {
      if (gk === 'style_name' || gk === 'version' || gk === 'subject_type') {
        clean[gk] = gv;
        continue;
      }
      if (gv && typeof gv === 'object' && !Array.isArray(gv)) {
        const cleanGroup: Record<string, unknown> = {};
        for (const [fk, fv] of Object.entries(gv as Record<string, unknown>)) {
          if (fv !== null && fv !== undefined && fv !== '') {
            if (Array.isArray(fv) && fv.length === 0) continue;
            cleanGroup[fk] = fv;
          }
        }
        if (Object.keys(cleanGroup).length > 0) clean[gk] = cleanGroup;
      }
    }
    setResultPrompt(JSON.stringify(clean, null, 2));
  };

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); showToast(L('edit_copied')); } catch { showToast(L('edit_copy_failed'), 'error'); }
  };

  const importanceBadge = (imp: string) => {
    const styles: Record<string, React.CSSProperties> = {
      required: { background: 'rgba(239,68,68,0.15)', color: 'var(--accent-danger)' },
      recommended: { background: 'rgba(245,158,11,0.15)', color: 'var(--accent-warning)' },
      optional: { background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)' },
    };
    const labels: Record<string, string> = {
      required: L('generate_required'),
      recommended: L('generate_recommended'),
      optional: L('generate_optional'),
    };
    return (
      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.6875rem', fontWeight: 700, ...(styles[imp] || {}) }}>
        {labels[imp] || imp}
      </span>
    );
  };

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_editor')}</a>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">{L('generate_title')} — {style.name}</h1>
          <p className="page-subtitle">{L('generate_subtitle')}</p>
        </div>
        {detected && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {fromCache && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '12px', background: 'rgba(99,102,241,0.08)' }}>
                ⚡ {locale === 'vi' ? 'Từ bộ nhớ đệm' : 'From cache'}
              </span>
            )}
            <button className="btn btn-sm" onClick={handleDetect} disabled={detecting}>
              🔄 {locale === 'vi' ? 'Phát hiện lại' : 'Re-detect'}
            </button>
          </div>
        )}
      </div>

      {/* Style locked badge */}
      {style.reference_images.length > 0 && (
        <div className="image-gallery" style={{ marginBottom: '16px' }}>
          {style.reference_images.slice(0, 4).map((img, i) => (<div key={i} className="image-thumb"><img src={img} alt={`ref ${i + 1}`} /></div>))}
        </div>
      )}

      {styleSummary && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.08)', borderLeft: '3px solid var(--accent-primary)', marginBottom: '24px', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600, marginRight: '8px' }}>{L('generate_style_summary')}:</span>
          {styleSummary}
        </div>
      )}

      {detecting && (
        <div className="analysis-progress slide-in" style={{ marginTop: '8px' }}>
          <div className="loading-bar"></div>
          <h3 className="analysis-progress-title" style={{ marginTop: '16px' }}>{L('generate_detecting_title')}</h3>
          <p className="analysis-progress-desc">{L('generate_detecting_desc')}</p>
        </div>
      )}

      {detected && variantFields.length > 0 && !resultPrompt && (
        <div className="slide-in">
          {/* Required first */}
          {(['required', 'recommended', 'optional'] as const).map(imp => {
            const fields = variantFields.filter(f => f.importance === imp);
            if (fields.length === 0) return null;
            return (
              <div key={imp} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  {importanceBadge(imp)}
                  <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)' }}></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
                  {fields.map(f => {
                    const key = fieldKey(f);
                    const label = locale === 'vi' ? f.label_vi : f.label_en;
                    const hint = locale === 'vi' ? f.hint_vi : f.hint_en;
                    const placeholder = locale === 'vi' ? f.placeholder_vi : f.placeholder_en;
                    const value = userValues[key] ?? (f.input_type === 'tags' ? [] : '');

                    return (
                      <div key={key} className="form-group" style={{ marginBottom: 0, background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: `1px solid ${imp === 'required' ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)'}` }}>
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{label}</span>
                          {importanceBadge(imp)}
                        </label>
                        {hint && <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>{hint}</div>}

                        {f.input_type === 'tags' ? (
                          <div className="tags-container" onClick={() => document.getElementById(`gen-tag-${key}`)?.focus()}>
                            {(value as string[]).map((tag, i) => (
                              <span key={i} className="tag">{tag}
                                <button className="tag-remove" onClick={() => setValue(key, (value as string[]).filter((_, idx) => idx !== i))}>×</button>
                              </span>
                            ))}
                            <input
                              id={`gen-tag-${key}`}
                              className="tags-input"
                              placeholder={(value as string[]).length === 0 ? placeholder : ''}
                              value={tagInputs[key] || ''}
                              onChange={(e) => setTagInputs(prev => ({ ...prev, [key]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && tagInputs[key]?.trim()) {
                                  e.preventDefault();
                                  setValue(key, [...(value as string[]), tagInputs[key].trim()]);
                                  setTagInputs(prev => ({ ...prev, [key]: '' }));
                                }
                                if (e.key === 'Backspace' && !tagInputs[key] && (value as string[]).length > 0) {
                                  setValue(key, (value as string[]).slice(0, -1));
                                }
                              }}
                            />
                          </div>
                        ) : f.input_type === 'textarea' ? (
                          <textarea
                            className="form-textarea"
                            placeholder={placeholder}
                            value={value as string}
                            onChange={(e) => setValue(key, e.target.value)}
                            rows={3}
                          />
                        ) : (
                          <input
                            className="form-input"
                            placeholder={placeholder}
                            value={value as string}
                            onChange={(e) => setValue(key, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={handleGenerate}>{L('generate_btn')}</button>
            <button className="btn btn-lg" onClick={handleDetect}>{locale === 'vi' ? '🔄 Làm mới' : '🔄 Refresh'}</button>
          </div>
        </div>
      )}

      {/* Result */}
      {resultPrompt && (
        <div className="card slide-in" style={{ marginTop: '8px', border: '1px solid var(--accent-success)', background: 'rgba(16,185,129,0.03)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--accent-success)' }}>{L('generate_result_title')}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-primary" onClick={() => handleCopy(resultPrompt)}>{L('generate_copy_prompt')}</button>
              <button className="btn btn-sm" onClick={() => { setResultPrompt(''); }}>{L('generate_new_variant')}</button>
            </div>
          </div>
          <pre className="prompt-output" style={{ maxHeight: '70vh', overflow: 'auto', fontSize: '0.875rem' }}>
            {resultPrompt}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Logs View
// ============================================================

function LogsView({ locale, onBack }: { locale: Locale; onBack: () => void }) {
  const [logs, setLogs] = useState<import('@/lib/logger').LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadLogs = useCallback(async () => {
    const { getLogs } = await import('@/lib/logger');
    setLogs(getLogs());
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLogs, 1500);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  const handleClear = async () => {
    const { clearLogs } = await import('@/lib/logger');
    clearLogs();
    setLogs([]);
  };

  const handleCopyAll = async () => {
    const text = filtered.map(e =>
      `[${new Date(e.timestamp).toISOString()}] [${e.level.toUpperCase()}] [${e.category}] ${e.message}` +
      (e.details ? '\n' + JSON.stringify(e.details, null, 2) : '')
    ).join('\n\n');
    await navigator.clipboard.writeText(text);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = logs.filter(e =>
    (filterLevel === 'all' || e.level === filterLevel) &&
    (filterCategory === 'all' || e.category === filterCategory)
  );

  const levelColor: Record<string, string> = {
    info:    'rgba(99,102,241,0.15)',
    success: 'rgba(16,185,129,0.15)',
    warning: 'rgba(245,158,11,0.15)',
    error:   'rgba(239,68,68,0.15)',
    debug:   'rgba(148,163,184,0.12)',
  };
  const levelText: Record<string, string> = {
    info: 'var(--accent-primary)', success: 'var(--accent-success)',
    warning: 'var(--accent-warning)', error: 'var(--accent-danger)',
    debug: 'var(--text-muted)',
  };
  const levelIcon: Record<string, string> = {
    info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', debug: '🔍',
  };
  const categoryIcon: Record<string, string> = {
    api_test: '🔑', ai_request: '🤖', settings: '⚙️',
    style: '🎨', navigation: '🧭', system: '🖥️',
  };

  const categories = ['all', 'api_test', 'ai_request', 'settings', 'style', 'navigation', 'system'];
  const levels = ['all', 'info', 'success', 'warning', 'error', 'debug'];

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>
        {locale === 'vi' ? '← Quay lại thư viện' : '← Back to library'}
      </a>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">📋 {locale === 'vi' ? 'System Logs' : 'System Logs'}</h1>
          <p className="page-subtitle">
            {locale === 'vi' ? `${filtered.length} bản ghi • Theo dõi hoạt động chi tiết của hệ thống` : `${filtered.length} entries • Detailed system activity monitoring`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : ''}`}
            onClick={() => setAutoRefresh(v => !v)}
          >
            {autoRefresh ? '⏸ Auto' : '▶ Auto'}
          </button>
          <button className="btn btn-sm" onClick={loadLogs}>🔄 {locale === 'vi' ? 'Làm mới' : 'Refresh'}</button>
          <button className="btn btn-sm" onClick={handleCopyAll}>📋 {locale === 'vi' ? 'Copy all' : 'Copy all'}</button>
          <button className="btn btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={handleClear}>
            🗑️ {locale === 'vi' ? 'Xóa' : 'Clear'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>Level:</span>
          {levels.map(l => (
            <button key={l} className={`btn btn-sm ${filterLevel === l ? 'btn-primary' : ''}`}
              onClick={() => setFilterLevel(l)}
              style={{ padding: '3px 8px', fontSize: '0.75rem', textTransform: 'capitalize' }}>
              {l === 'all' ? 'All' : `${levelIcon[l]} ${l}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>Category:</span>
          {categories.map(c => (
            <button key={c} className={`btn btn-sm ${filterCategory === c ? 'btn-primary' : ''}`}
              onClick={() => setFilterCategory(c)}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
              {c === 'all' ? 'All' : `${categoryIcon[c] || ''} ${c.replace('_', ' ')}`}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
          <p style={{ color: 'var(--text-secondary)' }}>
            {locale === 'vi' ? 'Chưa có logs. Thực hiện một hành động để bắt đầu ghi log.' : 'No logs yet. Perform an action to start logging.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(entry => {
            const isExpanded = expandedIds.has(entry.id);
            const hasDetails = !!entry.details;
            const ts = new Date(entry.timestamp);
            const time = ts.toLocaleTimeString('vi-VN', { hour12: false });
            const date = ts.toLocaleDateString('vi-VN');

            return (
              <div key={entry.id}
                onClick={() => hasDetails && toggleExpand(entry.id)}
                style={{
                  background: levelColor[entry.level] || 'var(--bg-tertiary)',
                  border: `1px solid ${isExpanded ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  cursor: hasDetails ? 'pointer' : 'default',
                  transition: 'border-color 0.2s',
                }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: levelText[entry.level] }}>
                    {levelIcon[entry.level]} {entry.level.toUpperCase()}
                  </span>
                  <span style={{
                    padding: '1px 7px', borderRadius: '10px', fontSize: '0.6875rem', fontWeight: 600,
                    background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)',
                  }}>
                    {categoryIcon[entry.category] || ''} {entry.category.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', flex: 1, minWidth: '200px' }}>
                    {entry.message}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {date} {time}
                  </span>
                  {hasDetails && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  )}
                </div>

                {/* Detail panel */}
                {isExpanded && entry.details && (
                  <pre style={{
                    marginTop: '10px', padding: '10px 12px',
                    background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem', color: 'var(--text-secondary)',
                    overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}>
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Settings View
// ============================================================

function SettingsView({ settings, locale, onBack, onSave, showToast }: {
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onSave: (settings: AppSettings) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  const providers: Array<{ type: 'openai' | 'anthropic' | 'openrouter' | 'litellm' | 'google' | 'vertexai'; name: string; icon: string }> = [
    { type: 'openai', name: 'OpenAI', icon: '🟢' }, { type: 'anthropic', name: 'Anthropic', icon: '🟠' },
    { type: 'openrouter', name: 'OpenRouter', icon: '🔵' }, { type: 'litellm', name: 'LiteLLM', icon: '🟣' },
    { type: 'google', name: 'Google AI Studio', icon: '🔵' },
    { type: 'vertexai', name: 'Google Vertex AI', icon: '🟡' },
  ];

  const updateProvider = (type: 'openai' | 'anthropic' | 'openrouter' | 'litellm' | 'google' | 'vertexai', field: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, providers: { ...prev.providers, [type]: { ...prev.providers[type], [field]: value } } }));
    setTestResults(prev => { const next = { ...prev }; delete next[type]; return next; });
  };

  const handleTestKey = async (type: 'openai' | 'anthropic' | 'openrouter' | 'litellm' | 'google' | 'vertexai') => {
    const config = localSettings.providers[type];
    if (!config.api_key && !(type === 'vertexai' && config.vertex_credentials)) {
      showToast(L('settings_enter_key'), 'warning'); return;
    }
    setTestingProvider(type);

    // Log test start
    const { logger, startTimer } = await import('@/lib/logger');
    const elapsed = startTimer();
    logger.info('api_test', `Testing API key for ${type}`, {
      provider: type,
      model: config.model,
      baseUrl: config.base_url,
      keyPrefix: config.api_key ? config.api_key.slice(0, 8) + '...' : 'NONE',
      hasCredentials: !!config.vertex_credentials,
    });

    try {
      const response = await fetch('/api/test-key', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: type,
          api_key: config.api_key,
          base_url: config.base_url,
          model: config.model,
          ...(type === 'vertexai' ? {
            vertex_project: config.vertex_project,
            vertex_location: config.vertex_location,
            vertex_credentials: config.vertex_credentials,
          } : {}),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setTestResults(prev => ({ ...prev, [type]: { success: true, message: data.message } }));
        showToast(L('settings_test_ok'));
        logger.success('api_test', `✅ API key test passed: ${type}`, {
          provider: type,
          message: data.message,
          elapsedMs: elapsed(),
        });
      } else {
        setTestResults(prev => ({ ...prev, [type]: { success: false, message: data.error } }));
        showToast(`${L('settings_test_fail')}${data.error}`, 'error');
        logger.error('api_test', `❌ API key test failed: ${type}`, {
          provider: type,
          error: data.error,
          elapsedMs: elapsed(),
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      setTestResults(prev => ({ ...prev, [type]: { success: false, message: msg } }));
      showToast(`${L('settings_test_fail')}${msg}`, 'error');
      logger.error('api_test', `❌ API key test exception: ${type}`, {
        provider: type,
        error: msg,
        elapsedMs: elapsed(),
      });
    } finally { setTestingProvider(null); }
  };

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_library')}</a>
      <div className="page-header"><h1 className="page-title">{L('settings_title')}</h1><p className="page-subtitle">{L('settings_subtitle')}</p></div>

      <div className="form-group" style={{ marginBottom: '24px' }}>
        <label className="form-label">{L('settings_active_provider')}</label>
        <select className="form-select" value={localSettings.active_provider}
          onChange={(e) => setLocalSettings(prev => ({ ...prev, active_provider: e.target.value as AppSettings['active_provider'] }))} style={{ maxWidth: '300px' }}>
          {providers.map(p => (<option key={p.type} value={p.type}>{p.icon} {p.name}</option>))}
        </select>
      </div>

      <div className="settings-grid">
        {providers.map(p => {
          const config = localSettings.providers[p.type];
          const isActive = localSettings.active_provider === p.type;
          const testResult = testResults[p.type];
          const isTesting = testingProvider === p.type;
          return (
            <div key={p.type} className={`card provider-card ${isActive ? 'active' : ''}`}>
              {isActive && <span className="provider-badge active">✓ Active</span>}
              <h3 className="card-title" style={{ marginBottom: '16px' }}>{p.icon} {p.name}</h3>

              {/* Vertex AI: Project + Location */}
              {p.type === 'vertexai' && (
                <>
                  <div className="form-group">
                    <label className="form-label">{locale === 'vi' ? 'Vertex Project *' : 'Vertex Project *'}</label>
                    <input className="form-input" placeholder="my-gcp-project-id" value={config.vertex_project || ''} onChange={(e) => updateProvider(p.type, 'vertex_project', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{locale === 'vi' ? 'Vertex Location' : 'Vertex Location'}</label>
                    <input className="form-input" placeholder="us-central1" value={config.vertex_location || ''} onChange={(e) => updateProvider(p.type, 'vertex_location', e.target.value)} />
                  </div>
                </>
              )}

              {/* API Key — optional label for Vertex AI */}
              <div className="form-group">
                <label className="form-label">
                  {L('settings_api_key')}{p.type === 'vertexai' ? <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>{locale === 'vi' ? '(tùy chọn nếu dùng Credentials)' : '(optional if using Credentials)'}</span> : null}
                </label>
                <input className="form-input" type="password" placeholder={p.type === 'vertexai' ? 'AIza... or OAuth2 token (optional)' : `${p.name} API key...`} value={config.api_key} onChange={(e) => updateProvider(p.type, 'api_key', e.target.value)} />
              </div>

              {/* Vertex AI: Credentials JSON upload */}
              {p.type === 'vertexai' && (
                <div className="form-group">
                  <label className="form-label">
                    {locale === 'vi' ? 'Vertex Credentials' : 'Vertex Credentials'}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>{locale === 'vi' ? '(file JSON service account)' : '(service account .json file)'}</span>
                  </label>
                  {config.vertex_credentials ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{
                        flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                        fontSize: '0.8125rem', color: 'var(--accent-success)',
                      }}>
                        ✅ {(() => { try { return JSON.parse(config.vertex_credentials).client_email || 'Credentials loaded'; } catch { return 'Credentials loaded'; } })()}
                      </div>
                      <button className="btn btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={() => updateProvider(p.type, 'vertex_credentials', '')}>
                        🗑️
                      </button>
                    </div>
                  ) : (
                    <label className="btn btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      📁 {locale === 'vi' ? 'Tải lên file .json' : 'Upload .json file'}
                      <input type="file" accept=".json" style={{ display: 'none' }} onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const text = await file.text();
                          JSON.parse(text); // validate JSON
                          updateProvider(p.type, 'vertex_credentials', text);
                          showToast(locale === 'vi' ? 'Đã tải credentials thành công!' : 'Credentials loaded successfully!');
                        } catch {
                          showToast(locale === 'vi' ? 'File JSON không hợp lệ' : 'Invalid JSON file', 'error');
                        }
                      }} />
                    </label>
                  )}
                </div>
              )}

              <div className="form-group"><label className="form-label">{L('settings_base_url')}</label><input className="form-input" placeholder={p.type === 'vertexai' ? (locale === 'vi' ? 'Tự động từ Project + Location' : 'Auto from Project + Location') : 'API base URL'} value={config.base_url} onChange={(e) => updateProvider(p.type, 'base_url', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{L('settings_model')}</label><input className="form-input" placeholder="Model name" value={config.model} onChange={(e) => updateProvider(p.type, 'model', e.target.value)} /></div>
              <button className={`btn btn-sm ${testResult?.success ? 'btn-success' : ''}`} onClick={() => handleTestKey(p.type)} disabled={isTesting} style={{ width: '100%' }}>
                {isTesting ? <><span className="loading-spinner"></span> {L('settings_testing')}</> : testResult ? (testResult.success ? L('settings_test_ok') : `❌ ${L('settings_test_btn')}`) : L('settings_test_btn')}
              </button>
              {testResult && (
                <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem',
                  background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: testResult.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                  borderLeft: `3px solid ${testResult.success ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
                }}>{testResult.message}</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary btn-lg" onClick={() => onSave(localSettings)}>{L('settings_save_btn')}</button>
        <button className="btn btn-lg" onClick={onBack}>{L('settings_cancel')}</button>
      </div>
    </div>
  );
}
