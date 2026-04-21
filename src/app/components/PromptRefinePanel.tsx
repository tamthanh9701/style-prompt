import React, { useState } from 'react';
import type { AppSettings, StyleLibrary, PromptSchema, RefineSuggestion } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { callRefinePrompt, fileToBase64, generateId } from '@/lib/storage';
import { type GenImageRecord, type RefImageRecord, blobToBase64 } from '@/lib/db';
import { Search, ClipboardCheck, Check, X } from 'lucide-react';

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
    const [userFeedback, setUserFeedback] = useState<string>('');
    const [feedbackImages, setFeedbackImages] = useState<{ id: string; data: string; mimeType: string }[]>([]);

    const handleFeedbackPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const spotsLeft = 4 - feedbackImages.length;
        if (spotsLeft <= 0) {
            showToast(locale === 'vi' ? 'Tối đa 4 ảnh phản hồi' : 'Max 4 feedback images', 'warning');
            return;
        }
        let added = 0;
        for (const file of files) {
            if (added >= spotsLeft) break;
            const b64 = await fileToBase64(file);
            setFeedbackImages(prev => [...prev, { id: `fb_${generateId()}`, data: b64, mimeType: file.type }]);
            added++;
        }
    };

    const handleRemoveFeedbackImage = (id: string) => {
        setFeedbackImages(prev => prev.filter(img => img.id !== id));
    };

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
            const b64Feedback = feedbackImages.map(f => f.data);

            const result = await callRefinePrompt(
                settings,
                b64Gen.filter(Boolean),
                b64Ref,
                style.prompt as PromptSchema,
                userFeedback.trim() || undefined,
                b64Feedback.length > 0 ? b64Feedback : undefined
            );
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
                    <h3 style={{ color: 'var(--accent-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><Search size={18} /> AI Prompt Refiner</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {locale === 'vi' ? 'So sánh ảnh đã tạo với ảnh gốc để khắc phục lỗi lệch prompt (drift).' : 'Compare generation results with references to fix style drift.'}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing || genImages.length === 0 || refRecords.length === 0}>
                    {analyzing ? <span className="loading-spinner" /> : (locale === 'vi' ? 'Phân tích Drift' : 'Analyze Drift')}
                </button>
            </div>

            {/* New Input UI */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                    placeholder={locale === 'vi' ? 'Nhập nhận xét của bạn về ảnh đã tạo so với mong muốn (tùy chọn)...' : 'Enter your feedback on the generated images vs what you wanted (optional)...'}
                    value={userFeedback}
                    onChange={e => setUserFeedback(e.target.value)}
                    style={{ width: '100%', minHeight: '60px', padding: '12px', background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'none' }}
                />

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {feedbackImages.map(img => (
                        <div key={img.id} style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                            <img src={img.data} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Feedback" />
                            <button
                                onClick={() => handleRemoveFeedbackImage(img.id)}
                                style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--bg-error, #ef4444)', color: 'white', border: 'none', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                            >
                                <X size={9} />
                            </button>
                        </div>
                    ))}

                    {feedbackImages.length < 4 && (
                        <label style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-3)', border: '1px dashed var(--border-strong)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <input type="file" multiple accept="image/*" hidden onChange={handleFeedbackPhotoUpload} />
                            <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
                        </label>
                    )}
                    {feedbackImages.length === 0 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '4px' }}>
                            {locale === 'vi' ? 'Upload ảnh mẫu mong muốn (tùy chọn)' : 'Upload desired target images (optional)'}
                        </span>
                    )}
                </div>
            </div>

            {suggestion && (
                <div className="slide-in" style={{ marginTop: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '4px', borderLeft: '3px solid var(--accent-warning)', marginBottom: '16px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardCheck size={14} /> Mức độ tin cậy: {suggestion.confidence}</div>
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

                    <button className="btn btn-primary btn-lg" onClick={handleApply} style={{ marginTop: '16px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Check size={18} /> Chấp nhận và Cập nhật Style Prompt
                    </button>
                </div>
            )}
        </div>
    );
}
