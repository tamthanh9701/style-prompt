import { callAI } from '@/lib/storage';
import { getGroupLabel, getFieldLabel } from '@/lib/i18n';
import EvalForm from '@/app/components/EvalForm';
import React, { useState, useEffect } from 'react';
import type { StyleLibrary, AppSettings, PromptInstance, EvalRecord } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { generateId, addPromptInstance, addEvalRecord, fileToBase64, callImageGen } from '@/lib/storage';
import { saveGenImage, getGenImages, type GenImageRecord } from '@/lib/db';

// ============================================================


export default function StyleTransferView({ style, settings, locale, onBack, showToast }: {
  style: StyleLibrary;
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [sourceImage, setSourceImage] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [imageDescription, setImageDescription] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [extractedSubject, setExtractedSubject] = useState<Record<string, any> | null>(null);
  const [resultPrompt, setResultPrompt] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  const handleUpload = async (files: FileList | File[]) => {
    const file = Array.from(files).find(f => f.type.startsWith('image/'));
    if (!file) return;
    const base64 = await fileToBase64(file);
    setSourceImage(base64);
    setExtractedSubject(null);
    setResultPrompt('');
    setImageDescription('');
  };

  const handleAnalyze = async () => {
    if (!sourceImage) { showToast(locale === 'vi' ? 'Vui lòng tải ảnh lên' : 'Please upload an image', 'warning'); return; }
    setAnalyzing(true);
    setExtractedSubject(null);
    setResultPrompt('');
    try {
      const result = await callAI(settings, 'variantFromImage', [sourceImage], {
        prompt_context: JSON.stringify(style.prompt, null, 2),
      });
      setImageDescription(result.image_description || '');
      setExtractedSubject(result.extracted_subject || {});
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Analysis failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!extractedSubject) return;

    // Merge: style prompt (fixed) + extracted subject (variable)
    const merged = JSON.parse(JSON.stringify(style.prompt)) as Record<string, unknown>;

    // Override SUBJECT groups with extracted values
    for (const groupKey of ['subject', 'subject_character', 'subject_object', 'environment', 'composition']) {
      if (extractedSubject[groupKey] && typeof extractedSubject[groupKey] === 'object') {
        if (!merged[groupKey] || typeof merged[groupKey] !== 'object') {
          merged[groupKey] = {};
        }
        const sourceGroup = extractedSubject[groupKey] as Record<string, unknown>;
        const targetGroup = merged[groupKey] as Record<string, unknown>;
        for (const [fk, fv] of Object.entries(sourceGroup)) {
          if (fv !== null && fv !== undefined && fv !== '') {
            targetGroup[fk] = fv;
          }
        }
      }
    }

    // Apply aspect ratio
    if (!merged.generation_params || typeof merged.generation_params !== 'object') {
      merged.generation_params = {};
    }
    (merged.generation_params as Record<string, unknown>).aspect_ratio = aspectRatio;

    // Clean nulls
    const clean: Record<string, unknown> = {};
    for (const [gk, gv] of Object.entries(merged)) {
      if (gk === 'style_name' || gk === 'version' || gk === 'subject_type') {
        clean[gk] = gv;
        continue;
      }
      if (gv && typeof gv === 'object' && !Array.isArray(gv)) {
        const cleanGroup: Record<string, unknown> = {};
        for (const [fk, fv] of Object.entries(gv as Record<string, unknown>)) {
          if (fv !== null && fv !== undefined && fv !== '' && !(Array.isArray(fv) && fv.length === 0)) {
            cleanGroup[fk] = fv;
          }
        }
        if (Object.keys(cleanGroup).length > 0) clean[gk] = cleanGroup;
      }
    }

    setResultPrompt(JSON.stringify(clean, null, 2));
    showToast(locale === 'vi' ? 'Đã tạo prompt thành công!' : 'Prompt generated successfully!');
  };

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); showToast(L('edit_copied')); } catch { showToast(L('edit_copy_failed'), 'error'); }
  };

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_editor')}</a>
      <div className="page-header">
        <h1 className="page-title">🔄 {locale === 'vi' ? 'Chuyển Ảnh Sang Style' : 'Style Transfer'} — {style.name}</h1>
        <p className="page-subtitle">
          {locale === 'vi'
            ? 'Tải ảnh lên → AI phân tích nội dung → Tạo prompt để vẽ lại ảnh đó theo style hiện tại'
            : 'Upload image → AI analyzes content → Generate prompt to recreate it in current style'}
        </p>
      </div>

      {/* Reference style images */}
      {style.reference_images.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
            🎨 {locale === 'vi' ? 'Style hiện tại:' : 'Current style:'}
          </div>
          <div className="image-gallery">
            {style.reference_images.slice(0, 4).map((img, i) => (<div key={i} className="image-thumb"><img src={img} alt={`ref ${i + 1}`} /></div>))}
          </div>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="comparison-container">
        {/* Source image upload */}
        <div className="comparison-panel">
          <div className="comparison-panel-header">📷 {locale === 'vi' ? 'Ảnh nguồn' : 'Source Image'}</div>
          <div className="comparison-panel-body">
            {sourceImage ? (
              <div style={{ position: 'relative' }}>
                <img src={sourceImage} alt="Source" style={{ width: '100%', borderRadius: 'var(--radius-sm)' }} />
                <button className="btn btn-sm" style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  onClick={() => { setSourceImage(''); setExtractedSubject(null); setResultPrompt(''); }}>✕</button>
              </div>
            ) : (
              <div className={`upload-zone ${dragOver ? 'dragover' : ''}`} style={{ padding: '40px 16px' }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
                onClick={() => document.getElementById('transfer-file-input')?.click()}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📷</div>
                <div className="upload-zone-title">
                  {locale === 'vi' ? 'Kéo thả ảnh vào đây hoặc click để chọn' : 'Drop image here or click to select'}
                </div>
                <div className="upload-zone-desc">
                  {locale === 'vi' ? 'AI sẽ phân tích nội dung và chuyển theo style' : 'AI will analyze content and transfer to style'}
                </div>
                <input id="transfer-file-input" type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => e.target.files && handleUpload(e.target.files)} />
              </div>
            )}
          </div>
        </div>

        {/* Extracted subject preview */}
        <div className="comparison-panel">
          <div className="comparison-panel-header">🧩 {locale === 'vi' ? 'Nội dung trích xuất' : 'Extracted Content'}</div>
          <div className="comparison-panel-body">
            {!extractedSubject && !analyzing && (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🧩</div>
                <p>{locale === 'vi' ? 'Tải ảnh lên và nhấn "Phân tích" để AI trích xuất nội dung' : 'Upload image and click "Analyze" for AI to extract content'}</p>
              </div>
            )}
            {analyzing && (
              <div className="analysis-progress" style={{ padding: '40px 16px' }}>
                <div className="loading-bar"></div>
                <h3 className="analysis-progress-title" style={{ marginTop: '16px' }}>
                  {locale === 'vi' ? 'Đang phân tích ảnh...' : 'Analyzing image...'}
                </h3>
                <p className="analysis-progress-desc">
                  {locale === 'vi' ? 'AI đang trích xuất nội dung từ ảnh nguồn' : 'AI is extracting content from source image'}
                </p>
              </div>
            )}
            {extractedSubject && (
              <div style={{ fontSize: '0.875rem' }}>
                {imageDescription && (
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(59,130,246,0.08)', borderLeft: '3px solid rgb(96,165,250)', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    <strong>📝</strong> {imageDescription}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px', fontStyle: 'italic' }}>
                  ✏️ {locale === 'vi' ? 'Chỉnh sửa các trường bên dưới trước khi tạo prompt' : 'Edit fields below before generating prompt'}
                </div>
                {Object.entries(extractedSubject).map(([groupKey, groupVal]) => {
                  if (!groupVal || typeof groupVal !== 'object') return null;
                  const entries = Object.entries(groupVal as Record<string, unknown>).filter(([, v]) =>
                    v !== null && v !== undefined && v !== ''
                  );
                  if (entries.length === 0) return null;
                  const locGroup = getGroupLabel(locale, groupKey);
                  return (
                    <div key={groupKey} style={{ marginBottom: '14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', fontSize: '0.8125rem' }}>
                        🧩 {locGroup.label || groupKey}
                      </div>
                      {entries.map(([fk, fv]) => {
                        const locField = getFieldLabel(locale, groupKey, fk);
                        const strVal = Array.isArray(fv) ? (fv as string[]).join(', ') : String(fv);
                        const isLong = strVal.length > 60;
                        return (
                          <div key={fk} className="form-group" style={{ marginBottom: '6px' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>{locField.label || fk}</label>
                            {isLong ? (
                              <textarea
                                className="form-textarea"
                                rows={2}
                                value={strVal}
                                onChange={(e) => {
                                  setExtractedSubject(prev => {
                                    if (!prev) return prev;
                                    const updated = { ...prev };
                                    updated[groupKey] = { ...updated[groupKey], [fk]: Array.isArray(fv) ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : e.target.value };
                                    return updated;
                                  });
                                }}
                                style={{ fontSize: '0.8125rem' }}
                              />
                            ) : (
                              <input
                                className="form-input"
                                value={strVal}
                                onChange={(e) => {
                                  setExtractedSubject(prev => {
                                    if (!prev) return prev;
                                    const updated = { ...prev };
                                    updated[groupKey] = { ...updated[groupKey], [fk]: Array.isArray(fv) ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : e.target.value };
                                    return updated;
                                  });
                                }}
                                style={{ fontSize: '0.8125rem' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aspect ratio + Analyze button */}
      <div className="card" style={{ marginTop: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
            <label className="form-label">{locale === 'vi' ? 'Tỉ lệ khung hình' : 'Aspect Ratio'}</label>
            <select className="form-select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="3:4">3:4 (Portrait)</option>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="9:16">9:16 (Story/Reel)</option>
              <option value="3:2">3:2 (Photo)</option>
              <option value="2:3">2:3 (Portrait Photo)</option>
              <option value="21:9">21:9 (Cinematic)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
            {!extractedSubject ? (
              <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={analyzing || !sourceImage}>
                {analyzing ? <><span className="loading-spinner"></span> {locale === 'vi' ? 'Đang phân tích...' : 'Analyzing...'}</> : <>🔍 {locale === 'vi' ? 'Phân tích ảnh' : 'Analyze Image'}</>}
              </button>
            ) : (
              <>
                <button className="btn" onClick={handleAnalyze} disabled={analyzing}>
                  🔄 {locale === 'vi' ? 'Phân tích lại' : 'Re-analyze'}
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleGenerate}>
                  ✨ {locale === 'vi' ? 'Tạo Prompt' : 'Generate Prompt'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Result prompt */}
      {resultPrompt && (
        <div className="card slide-in" style={{ marginTop: '20px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ color: 'var(--accent-success)' }}>✅ {locale === 'vi' ? 'Prompt đã tạo' : 'Generated Prompt'}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-primary" onClick={() => handleCopy(resultPrompt)}>📋 {locale === 'vi' ? 'Copy' : 'Copy'}</button>
              <button className="btn btn-sm" onClick={() => { setResultPrompt(''); setExtractedSubject(null); setSourceImage(''); }}>
                🔄 {locale === 'vi' ? 'Chuyển ảnh khác' : 'Transfer another'}
              </button>
            </div>
          </div>
          <pre className="prompt-output" style={{ maxHeight: '60vh', overflow: 'auto', fontSize: '0.875rem' }}>
            {resultPrompt}
          </pre>
        </div>
      )}

      {/* Eval Form for style transfer */}
      {resultPrompt && (
        <EvalForm
          locale={locale}
          styleId={style.id}
          styleVersion={style.version || 1}
          task="style_transfer"
          finalPrompt={resultPrompt}
          settings={settings}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ============================================================
// EvalForm — Reusable evaluation form (style fidelity + content match)
// ============================================================

