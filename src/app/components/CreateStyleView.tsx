import React, { useState } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { createEmptyPrompt, PROMPT_GROUPS } from '@/types';
import { fileToBase64, generateId, callAI } from '@/lib/storage';
import { type Locale, t, getGroupLabel, getFieldLabel } from '@/lib/i18n';
import { setRefImages as idbSetRefImages, base64ToBlob, type RefImageRecord } from '@/lib/db';
import { UploadCloud, FilePlus, Bot, X, FileImage, Layers } from 'lucide-react';

export default function CreateStyleView({ settings, locale, onBack, onCreate, showToast }: {
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onCreate: (style: StyleLibrary) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [styleName, setStyleName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ style: StyleLibrary; fieldCount: number; refImages: string[], meta?: any } | null>(null);
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const base64s: string[] = [];

    // Process sequentially so we don't freeze the browser with 20+ simultaneous Canvas renders
    for (const file of fileArray) {
      const b64 = await fileToBase64(file);
      base64s.push(b64);
      // Yield thread to prevent UI lockup
      await new Promise(r => setTimeout(r, 10));
    }

    setImages(prev => [...prev, ...base64s]);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };

  const handleAnalyze = async () => {
    if (images.length === 0) { showToast(L('create_upload_warning'), 'warning'); return; }
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await callAI(settings, 'analyzeStyle', images);

      const payloadSchema = result.schema || result; // Backward compat fallback
      const meta = result._analysis_meta || { confidence: 'high', notes: 'Style analysis complete.' };

      const prompt: PromptSchema = {
        ...createEmptyPrompt(styleName || payloadSchema.style_name || 'Untitled Style'),
        ...payloadSchema,
        style_name: styleName || payloadSchema.style_name || 'Untitled Style',
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

      const styleId = generateId();
      const style: StyleLibrary = {
        id: styleId,
        name: prompt.style_name,
        description: meta.notes || '',
        styleType: 'photo', // fallback or derived
        tags: [],
        coverImageId: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'draft',
        version: 1,
        activeVersionId: generateId(),

        ref_image_count: images.length,
        prompt,

        // DEPRECATED 
        reference_images: [],
        prompt_history: [],
        generated_images: [],
        generated_image_ids: [],
        prompt_instances: [],
        eval_records: [],
      };

      setAnalysisResult({ style, fieldCount, refImages: images, meta });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Analysis failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateBlank = () => {
    if (!styleName.trim()) {
      showToast(locale === 'vi' ? 'Vui lòng nhập tên style' : 'Please enter style name', 'warning');
      return;
    }
    const styleId = generateId();
    const style: StyleLibrary = {
      id: styleId,
      name: styleName || 'Untitled Style',
      description: '',
      styleType: 'photo',
      tags: [],
      coverImageId: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'draft',
      version: 1,
      activeVersionId: generateId(),
      ref_image_count: 0,
      prompt: createEmptyPrompt(styleName || 'Untitled Style'),
      reference_images: [],
      prompt_history: [],
      generated_images: [],
      generated_image_ids: [],
      prompt_instances: [],
      eval_records: [],
    };
    onCreate(style);
  };

  const handleAcceptResult = async () => {
    if (analysisResult) {
      setSaving(true);
      try {
        if (analysisResult.refImages && analysisResult.refImages.length > 0) {
          const records: RefImageRecord[] = analysisResult.refImages.map((b64, index) => ({
            id: `${analysisResult.style.id}_ref_init_${index}`,
            libraryId: analysisResult.style.id,
            data: base64ToBlob(b64),
            mimeType: b64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg',
            index,
            source: 'original',
            addedAt: new Date().toISOString()
          }));
          await idbSetRefImages(analysisResult.style.id, records);
          // Auto assign the first uploaded image as the cover image
          analysisResult.style.coverImageId = records[0].id;
        }
        onCreate(analysisResult.style);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error saving style', 'error');
        console.error(err);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_library')}</a>
        <div className="page-header"><h1 className="page-title">{L('create_title')}</h1><p className="page-subtitle">{L('create_subtitle')}</p></div>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left Column: Input and Upload */}
        <div style={{ flex: '1 1 400px', minWidth: '320px', maxWidth: analysisResult ? '500px' : '800px' }}>
          <div className="form-group">
            <label className="form-label">{L('create_style_name')}</label>
            <input className="form-input" placeholder={L('create_style_name_placeholder')} value={styleName} onChange={(e) => setStyleName(e.target.value)} />
          </div>

          <div className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="upload-zone-icon"><UploadCloud size={48} strokeWidth={1} color="var(--accent-primary)" /></div>
            <div className="upload-zone-title">{L('create_drop_title')}</div>
            <div className="upload-zone-desc">{L('create_drop_desc')}</div>
            <input id="file-input" type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          </div>

          {images.length > 0 && (
            <div className="image-gallery">
              {images.map((img, i) => (
                <div key={i} className="image-thumb"><img src={img} alt={`Upload ${i + 1}`} />
                  <button className="image-thumb-remove" onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, idx) => idx !== i)); }}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={analyzing || images.length === 0} style={{ width: '100%' }}>
              {analyzing ? <><span className="loading-spinner"></span> {L('create_analyzing')}</> : <>{L('create_analyze_btn')}</>}
            </button>
            <button className="btn btn-secondary btn-lg" onClick={handleCreateBlank} disabled={analyzing} style={{ width: '100%', marginTop: '12px' }}>
              <FilePlus size={18} /> {locale === 'vi' ? ' Tạo Style Trống (Thủ công)' : ' Create Blank Style (Manual)'}
            </button>
          </div>

          {analyzing && (
            <div className="analysis-progress slide-in" style={{ marginTop: '24px' }}>
              <div className="loading-bar"></div>
              <h3 className="analysis-progress-title" style={{ marginTop: '16px' }}>{L('create_analyzing_title')}</h3>
              <p className="analysis-progress-desc">{L('create_analyzing_desc')}</p>
            </div>
          )}
        </div>

        {/* Right Column: AI Review Panel */}
        {analysisResult && (
          <div style={{ flex: '1 1 500px', minWidth: '400px' }}>
            <div className="card slide-in" style={{ border: '1px solid var(--accent-success)', background: 'rgba(16,185,129,0.05)', margin: 0 }}>
              <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--accent-success)' }}>{L('analysis_complete')}</h3>
                <span style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {analysisResult.fieldCount} {L('analysis_fields_detected')}
                </span>
              </div>
              {analysisResult.meta && (
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', borderLeft: '3px solid var(--accent-warning)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Bot size={14} /> AI Confidence: {analysisResult.meta.confidence}</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{analysisResult.meta.notes}</p>
                </div>
              )}

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
                    <div key={group.key} style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--border-active)' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><Layers size={14} /> {groupLabel}</div>
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

              <button className="btn btn-primary btn-lg" onClick={handleAcceptResult} disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Saving...' : L('analysis_view_edit')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
