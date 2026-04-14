import type { AppSettings } from '@/types';
import { generateId, addPromptInstance } from '@/lib/storage';
import React, { useState } from 'react';
import { type Locale, t } from '@/lib/i18n';
import { addEvalRecord } from '@/lib/storage';

export default function EvalForm({ locale, styleId, styleVersion, task, finalPrompt, settings, showToast }: {
  locale: Locale;
  styleId: string;
  styleVersion: number;
  task: import('@/types').PromptTask;
  finalPrompt: string;
  settings: AppSettings;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [styleFidelity, setStyleFidelity] = useState(0);
  const [contentMatch, setContentMatch] = useState(0);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', minWidth: '140px' }}>{label}</span>
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button"
            onClick={() => onChange(star)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '2px',
              color: star <= value ? '#f59e0b' : 'var(--border-color)',
              transition: 'color 0.15s',
            }}>
            {star <= value ? '★' : '☆'}
          </button>
        ))}
      </div>
      {value > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{value}/5</span>}
    </div>
  );

  const handleSave = () => {
    if (styleFidelity === 0 || contentMatch === 0) {
      showToast(locale === 'vi' ? 'Vui lòng đánh giá cả hai tiêu chí' : 'Please rate both criteria', 'warning');
      return;
    }
    const instanceId = generateId();
    const provider = settings.providers[settings.active_provider];

    addPromptInstance(styleId, {
      id: instanceId,
      style_id: styleId,
      style_version: styleVersion,
      task,
      subject_snapshot: {},
      final_prompt: finalPrompt,
      model_used: provider.model,
      created_at: new Date().toISOString(),
    });

    addEvalRecord(styleId, {
      id: generateId(),
      prompt_instance_id: instanceId,
      style_id: styleId,
      style_fidelity_score: styleFidelity,
      content_match_score: contentMatch,
      notes,
      created_at: new Date().toISOString(),
    });

    setSaved(true);
    showToast(locale === 'vi' ? 'Đã lưu đánh giá!' : 'Evaluation saved!');
  };

  if (saved) {
    return (
      <div className="card" style={{ marginTop: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
        <span style={{ fontSize: '1.25rem' }}>✅</span> {locale === 'vi' ? 'Đã lưu đánh giá' : 'Evaluation saved'}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>Style: ★{styleFidelity} | Content: ★{contentMatch}</span>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '12px', padding: '16px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.03)' }}>
      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
        📊 {locale === 'vi' ? 'Đánh giá prompt' : 'Evaluate Prompt'}
      </div>
      <StarRating label={locale === 'vi' ? 'Độ giống style' : 'Style Fidelity'} value={styleFidelity} onChange={setStyleFidelity} />
      <StarRating label={locale === 'vi' ? 'Độ khớp nội dung' : 'Content Match'} value={contentMatch} onChange={setContentMatch} />
      <div className="form-group" style={{ marginBottom: '10px', marginTop: '4px' }}>
        <textarea
          className="form-textarea"
          placeholder={locale === 'vi' ? 'Ghi chú (tùy chọn): palette, lighting, composition...' : 'Notes (optional): palette, lighting, composition...'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ fontSize: '0.8125rem' }}
        />
      </div>
      <button className="btn btn-sm btn-primary" onClick={handleSave}>
        💾 {locale === 'vi' ? 'Lưu đánh giá' : 'Save Evaluation'}
      </button>
    </div>
  );
}