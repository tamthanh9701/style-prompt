import React, { useState } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { createEmptyPrompt, PROMPT_GROUPS } from '@/types';
import { fileToBase64, generateId, callAI } from '@/lib/storage';
import { type Locale, t, getGroupLabel, getFieldLabel } from '@/lib/i18n';
import { setRefImages as idbSetRefImages } from '@/lib/db';

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
  const [dragOver, setDragOver] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ style: StyleLibrary; fieldCount: number; refImages: string[] } | null>(null);
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
        status: 'draft',
        version: 1,
        reference_images: [], // Images stored in IndexedDB — passed separately
        ref_image_count: images.length,
        prompt,
        prompt_history: [prompt],
        generated_images: [],
        generated_image_ids: [],
        prompt_instances: [],
        eval_records: [],
      };

      setAnalysisResult({ style, fieldCount, refImages: images });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Analysis failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcceptResult = async () => {
    if (analysisResult) {
      // Migrate reference images to IndexedDB before saving
      if (analysisResult.refImages && analysisResult.refImages.length > 0) {
        await idbSetRefImages(analysisResult.style.id, analysisResult.refImages);
      }
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
