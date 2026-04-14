import { flattenPrompt } from '@/types';
import { getGroupLabel, getFieldLabel } from '@/lib/i18n';
import React, { useState, useRef } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { callAI, fileToBase64 } from '@/lib/storage';

// ============================================================

export default function CompareView({ style, settings, locale, onBack, onUpdate, showToast }: {
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

      {/* User Feedback — always visible so users can provide context before analyzing */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-header">
          <h3 className="card-title">💬 {locale === 'vi' ? 'Phản hồi của bạn' : 'Your Feedback'}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{locale === 'vi' ? 'Tùy chọn' : 'Optional'}</span>
        </div>
        <textarea
          className="form-textarea"
          value={userFeedback}
          onChange={(e) => setUserFeedback(e.target.value)}
          rows={2}
          placeholder={locale === 'vi'
            ? 'Nhập phản hồi để cải thiện kết quả, VD: "Tôi muốn màu sắc ấm hơn" hoặc "Ánh sáng cần mềm mại hơn"...'
            : 'Enter feedback to guide improvements, e.g. "I want warmer colors" or "Lighting needs to be softer"...'}
        />
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button className="btn btn-primary btn-lg" onClick={handleCompare} disabled={comparing || generatedImages.length === 0}>
          {comparing ? <><span className="loading-spinner"></span> {L('compare_analyzing')}</> : <>{L('compare_btn')}</>}
        </button>
      </div>


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
