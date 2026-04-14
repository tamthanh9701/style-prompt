import { type VariantField } from '@/types';
import EvalForm from '@/app/components/EvalForm';
import { callAI } from '@/lib/storage';
import React, { useState, useEffect } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { callImageGen, generateId } from '@/lib/storage';
import { saveGenImage, getGenImages } from '@/lib/db';

// ============================================================
// Compare View — with selectable improvements

export default function GenerateView({ style, settings, locale, onBack, onUpdate, showToast }: {
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
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [cameraAngle, setCameraAngle] = useState<string>(
    ((style.prompt.composition as unknown as Record<string, unknown> | undefined)?.camera_angle as string) || ''
  );
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

    // Merge aspect ratio into generation_params
    if (!variantPrompt.generation_params || typeof variantPrompt.generation_params !== 'object') {
      variantPrompt.generation_params = {};
    }
    (variantPrompt.generation_params as Record<string, unknown>).aspect_ratio = aspectRatio;

    // Merge camera angle into composition (if user specified, override style default)
    if (cameraAngle.trim()) {
      if (!variantPrompt.composition || typeof variantPrompt.composition !== 'object') {
        variantPrompt.composition = {};
      }
      (variantPrompt.composition as Record<string, unknown>).camera_angle = cameraAngle.trim();
    }

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
          {/* Aspect Ratio & Camera Angle — always shown */}
          <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
            <h3 className="card-title" style={{ marginBottom: '12px' }}>📏 {locale === 'vi' ? 'Cài đặt khung hình' : 'Frame Settings'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
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
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{locale === 'vi' ? 'Góc nhìn' : 'Camera Angle'}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                    {locale === 'vi' ? '(để trống = theo style)' : '(empty = from style)'}
                  </span>
                </label>
                <input className="form-input" value={cameraAngle}
                  onChange={(e) => setCameraAngle(e.target.value)}
                  placeholder={locale === 'vi' ? 'VD: eye level, bird\'s eye, low angle...' : 'e.g. eye level, bird\'s eye, low angle...'}
                />
              </div>
            </div>
          </div>
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

      {/* Eval Form — rate generated prompt */}
      {resultPrompt && (
        <EvalForm
          locale={locale}
          styleId={style.id}
          styleVersion={style.version || 1}
          task="generate_new"
          finalPrompt={resultPrompt}
          settings={settings}
          showToast={showToast}
        />
      )}
    </div>
  );
}
// ============================================================
// Style Transfer View — Upload image → AI extracts subject → Merge with style
// ============================================================
