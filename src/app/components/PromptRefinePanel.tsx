import React, { useState } from 'react';
import type { AppSettings, StyleLibrary, PromptSchema, RefineSuggestion } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { callRefinePrompt } from '@/lib/storage';
import { type GenImageRecord, type RefImageRecord, blobToBase64 } from '@/lib/db';

export default function PromptRefinePanel({
    style,
    settings,
    locale,
    genImages,
    refRecords,
    onPromptUpdate,
    showToast
}: {
    style: StyleLibrary;
    settings: AppSettings;
    locale: Locale;
    genImages: GenImageRecord[];
    refRecords: RefImageRecord[];
    onPromptUpdate: (updates: Partial<StyleLibrary>) => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
    const [analyzing, setAnalyzing] = useState(false);
    const [suggestion, setSuggestion] = useState<RefineSuggestion | null>(null);

    const handleAnalyze = async () => {
        if (genImages.length === 0 || refRecords.length === 0) {
            showToast(locale === 'vi' ? 'Cần ít nhất 1 ảnh Generate và 1 ảnh Reference để so sánh.' : 'Need at least 1 Generated Image and 1 Ref Image to compare.', 'warning');
            return;
        }
        setAnalyzing(true);
        setSuggestion(null);
        try {
            const gImgs = genImages.slice(0, 2);
            const rImgs = refRecords.slice(0, 2);

            const b64Gen = await Promise.all(gImgs.map(i => {
                if (typeof i.data === 'string') return i.data;
                if (i.data instanceof Blob) return blobToBase64(i.data);
                return '';
            }));
            const b64Ref = await Promise.all(rImgs.map(i => blobToBase64(i.data)));

            const result = await callRefinePrompt(settings, b64Gen.filter(Boolean), b64Ref, style.prompt as PromptSchema);
            setSuggestion(result);
        } catch (err: any) {
            showToast(err.message || 'Drift Analysis failed', 'error');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleApply = () => {
        if (!suggestion) return;
        const newPrompt = { ...(style.prompt as any) };

        suggestion.suggested_changes.forEach(change => {
            if (!newPrompt[change.group]) newPrompt[change.group] = {};
            newPrompt[change.group][change.field] = change.suggested_value;
        });

        onPromptUpdate({ prompt: newPrompt });
        showToast(locale === 'vi' ? 'Đã cập nhật cấu trúc Style Prompt thành công!' : 'Style prompt updated successfully!', 'success');
        setSuggestion(null);
    };

    return (
        <div className="card" style={{ marginBottom: '24px', border: '2px dashed var(--accent-primary)', background: 'rgba(56, 189, 248, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ color: 'var(--accent-primary)', marginBottom: '4px' }}>🔍 AI Prompt Refiner</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {locale === 'vi' ? 'So sánh ảnh đã tạo với ảnh gốc để khắc phục lỗi lệch prompt (drift).' : 'Compare generation results with references to fix style drift.'}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing || genImages.length === 0 || refRecords.length === 0}>
                    {analyzing ? <span className="loading-spinner" /> : (locale === 'vi' ? 'Phân tích Drift' : 'Analyze Drift')}
                </button>
            </div>

            {suggestion && (
                <div className="slide-in" style={{ marginTop: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '4px', borderLeft: '3px solid var(--accent-warning)', marginBottom: '16px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-warning)' }}>📝 Mức độ tin cậy: {suggestion.confidence}</div>
                        <p style={{ fontSize: '0.85rem', marginTop: '4px', color: 'var(--text-secondary)' }}>{suggestion.drift_summary}</p>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '8px' }}>Trường dữ liệu</th>
                                    <th style={{ padding: '8px' }}>Hiện tại</th>
                                    <th style={{ padding: '8px', color: 'var(--accent-success)' }}>Gợi ý thay đổi</th>
                                    <th style={{ padding: '8px' }}>Lý do (Drift)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suggestion.suggested_changes.map((change, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '8px', fontWeight: 600 }}>{change.group} / {change.field}</td>
                                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{change.current_value || '(Trống)'}</td>
                                        <td style={{ padding: '8px', color: 'var(--accent-success)', fontWeight: 'bold' }}>{change.suggested_value}</td>
                                        <td style={{ padding: '8px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{change.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button className="btn btn-primary btn-lg" onClick={handleApply} style={{ marginTop: '16px', width: '100%' }}>
                        ✅ Chấp nhận và Cập nhật Style Prompt
                    </button>
                </div>
            )}
        </div>
    );
}
