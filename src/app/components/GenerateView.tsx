import React, { useState, useEffect, useCallback } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { callImageGen, generateId, fileToBase64 } from '@/lib/storage';
import { saveGenImage, getGenImages, getRefImages, putRefImage, type GenImageRecord, type RefImageRecord, blobToBase64 } from '@/lib/db';
import { flattenPrompt } from '@/types';
import PromptRefinePanel from '@/app/components/PromptRefinePanel';
import { Paperclip, Sparkles, Rocket, PenTool, Star, DownloadCloud, Settings2, ChevronDown, ChevronUp, ImageIcon, X, ArrowLeft, ZoomIn, Maximize2 } from 'lucide-react';

export default function GenerateView({ style, settings, locale, onBack, onUpdate, showToast, onRequestEdit }: {
  style: StyleLibrary;
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<StyleLibrary>) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  onRequestEdit?: (imageId: string) => void;
}) {
  const [contentIdea, setContentIdea] = useState<string>('');
  const [contentMode, setContentMode] = useState<'multi-item' | 'freeform'>('multi-item');
  const [contentItems, setContentItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const [cameraAngle, setCameraAngle] = useState<string>('');
  const [dominantColor, setDominantColor] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>(
    Array.isArray((style.prompt as any).negative_prompt)
      ? (style.prompt as any).negative_prompt.join(', ')
      : ((style.prompt as any).negative_prompt || '')
  );
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [sampleCount, setSampleCount] = useState<number>(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [genImages, setGenImages] = useState<GenImageRecord[]>([]);
  const [refRecords, setRefRecords] = useState<RefImageRecord[]>([]);
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set());
  const [viewerImage, setViewerImage] = useState<GenImageRecord | null>(null);
  const [genProgress, setGenProgress] = useState<string[]>([]);
  const [adHocRefs, setAdHocRefs] = useState<{ id: string; data: string; mimeType: string }[]>([]);

  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  const reloadImages = useCallback(async () => {
    const gImgs = await getGenImages(style.id);
    setGenImages(gImgs);
  }, [style.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const gImgs = await getGenImages(style.id);
      if (!cancelled) setGenImages(gImgs);
      const rImgs = await getRefImages(style.id);
      if (!cancelled) {
        setRefRecords(rImgs);
        const sel = new Set<string>();
        rImgs.slice(0, 4).forEach(r => sel.add(r.id));
        setSelectedRefIds(sel);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [style.id]);

  const totalSelectedRefs = selectedRefIds.size + adHocRefs.length;

  const handleRefToggle = (id: string) => {
    setSelectedRefIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size + adHocRefs.length >= 4) {
          showToast(locale === 'vi' ? 'Tối đa 4 ảnh Reference' : 'Max 4 References', 'warning');
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handeRemoveAdHoc = (id: string) => {
    setAdHocRefs(prev => prev.filter(r => r.id !== id));
  };

  const handleTempRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const spotsLeft = 4 - totalSelectedRefs;
    if (spotsLeft <= 0) {
      showToast(locale === 'vi' ? 'Tối đa 4 ảnh Reference' : 'Max 4 References', 'warning');
      return;
    }
    let added = 0;
    for (const file of files) {
      if (added >= spotsLeft) break;
      const b64 = await fileToBase64(file);
      setAdHocRefs(prev => [...prev, { id: `adhoc_${generateId()}`, data: b64, mimeType: file.type }]);
      added++;
    }
  };

  const handleAddItem = () => {
    const val = newItemText.trim();
    if (!val) return;
    if (contentItems.length >= 10) {
      showToast(locale === 'vi' ? 'Tối đa 10 items' : 'Max 10 items allowed', 'warning');
      return;
    }
    setContentItems(prev => [...prev, val]);
    setNewItemText('');
  };

  const handleRemoveItem = (index: number) => {
    setContentItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenProgress([]);
    try {
      setGenProgress(p => [...p, locale === 'vi' ? '✨ Đang chuẩn bị prompt...' : '✨ Preparing prompt...']);
      const flatStyle = flattenPrompt(style.prompt as PromptSchema);
      const selectedLibRefs = refRecords.filter(r => selectedRefIds.has(r.id));
      const totalRefs = selectedLibRefs.length + adHocRefs.length;

      if (totalRefs > 0) {
        setGenProgress(p => [...p, locale === 'vi'
          ? `🖼️ Đang chuẩn bị ${totalRefs} ảnh tham chiếu (${selectedLibRefs.length} từ thư viện, ${adHocRefs.length} đính kèm)...`
          : `🖼️ Preparing ${totalRefs} reference images (${selectedLibRefs.length} from library, ${adHocRefs.length} attached)...`
        ]);
      } else {
        setGenProgress(p => [...p, locale === 'vi' ? '🖼️ Không có ảnh tham chiếu — AI sẽ tự tạo theo style prompt' : '🖼️ No reference images — AI will generate from style prompt only']);
      }
      const b64SelectedLibRefs = await Promise.all(selectedLibRefs.map(r => blobToBase64(r.data)));
      const b64Refs = [...b64SelectedLibRefs, ...adHocRefs.map(r => r.data)].slice(0, 4);

      if (b64Refs.length > 0) {
        const sizes = b64Refs.map((b, i) => {
          const sizeKB = Math.round(b.length * 0.75 / 1024);
          return `Ref ${i + 1}: ~${sizeKB}KB`;
        });
        setGenProgress(p => [...p, locale === 'vi'
          ? `📎 Đã encode ${b64Refs.length} ảnh ref (${sizes.join(', ')}) — đính kèm vào request`
          : `📎 Encoded ${b64Refs.length} ref images (${sizes.join(', ')}) — attaching to request`
        ]);
      }

      let promptIdea = '';
      if (contentMode === 'multi-item') {
        if (contentItems.length === 0) {
          showToast(locale === 'vi' ? 'Vui lòng thêm ít nhất 1 item' : 'Please add at least 1 item', 'warning');
          setGenerating(false);
          setGenProgress([]);
          return;
        }
        promptIdea = `game asset sheet containing ${contentItems.length} items. The items are:\n${contentItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
      } else {
        if (!contentIdea.trim()) {
          showToast(locale === 'vi' ? 'Vui lòng nhập ý tưởng nội dung' : 'Please enter a content idea', 'warning');
          setGenerating(false);
          setGenProgress([]);
          return;
        }
        promptIdea = contentIdea;
      }

      if (cameraAngle.trim()) promptIdea += `\n[CAMERA ANGLE] ${cameraAngle.trim()}`;
      if (dominantColor.trim()) promptIdea += `\n[DOMINANT COLOR] ${dominantColor.trim()}`;

      const payload = {
        MANDATORY_STYLE: flatStyle.positive,
        CONTENT: promptIdea
      };

      setGenProgress(p => [...p, locale === 'vi'
        ? `🚀 Gửi yêu cầu đến AI (${sampleCount} ảnh, ${aspectRatio})...`
        : `🚀 Sending request to AI (${sampleCount} images, ${aspectRatio})...`
      ]);

      const imagesB64 = await callImageGen(settings, payload, {
        negative_prompt: negativePrompt,
        aspect_ratio: aspectRatio,
        sample_count: sampleCount,
        reference_images: b64Refs
      });

      setGenProgress(p => [...p, locale === 'vi'
        ? `✅ Nhận được ${imagesB64.length} ảnh! Đang lưu vào thư viện...`
        : `✅ Received ${imagesB64.length} images! Saving to library...`
      ]);

      const newRecords: GenImageRecord[] = imagesB64.map(b64 => ({
        id: `gen_${generateId()}`,
        libraryId: style.id,
        data: b64,
        promptText: `[CONTENT] ${contentIdea}\n[STYLE] ${flatStyle.positive}`,
        promptJson: JSON.stringify({ MANDATORY_STYLE: flatStyle.positive, CONTENT: contentIdea }),
        createdAt: new Date().toISOString(),
        generationSource: 'imagen',
        aspectRatio: aspectRatio,
      }));

      const { base64ToBlob } = await import('@/lib/db');
      for (const rec of newRecords) {
        rec.data = base64ToBlob(rec.data as string) as unknown as string;
        await saveGenImage(rec);
      }

      // Reload from DB to avoid duplicates
      await reloadImages();
      setGenProgress(p => [...p, locale === 'vi' ? '🎉 Hoàn tất!' : '🎉 Done!']);
      showToast(locale === 'vi' ? `Tạo thành công ${imagesB64.length} ảnh!` : `Generated ${imagesB64.length} images!`);
    } catch (err: any) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
      // Clear progress after a delay so user can see the final state
      setTimeout(() => setGenProgress([]), 3000);
    }
  };

  const handlePromote = async (record: GenImageRecord) => {
    if (confirm(locale === 'vi' ? 'Sử dụng ảnh này làm Style Reference chuẩn (Đánh giá ⭐ Cao)?' : 'Promote this image to be a Style Reference (High Fidelity)?')) {
      const currentRefs = await getRefImages(style.id);
      await putRefImage({
        id: `${style.id}_ref_gen_${Date.now()}`,
        libraryId: style.id,
        data: record.data as unknown as Blob,
        mimeType: 'image/jpeg',
        index: currentRefs.length,
        source: 'generated',
        addedAt: new Date().toISOString()
      });
      onUpdate(style.id, { ref_image_count: currentRefs.length + 1 });
      showToast(locale === 'vi' ? 'Đã thêm vào thư viện Style' : 'Promoted to Style Library!', 'success');
    }
  };

  const renderObjUrl = (data: any) => {
    if (typeof data === 'string') return data;
    if (data instanceof Blob) return URL.createObjectURL(data);
    return '';
  };

  const hasContent = contentMode === 'multi-item' ? contentItems.length > 0 : contentIdea.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', flexShrink: 0, borderBottom: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-sm" onClick={onBack} style={{ border: 'none', padding: '6px' }}><ArrowLeft size={18} /></button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

        {/* ── HERO: CONTENT IDEA INPUT ── */}
        <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '32px 0' }}>

          {/* Welcome/Instruction */}
          {genImages.length === 0 && !generating && (
            <div style={{ textAlign: 'center', marginBottom: '32px', animation: 'fadeIn 0.5s ease-out' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {locale === 'vi' ? 'Bạn muốn tạo gì hôm nay?' : 'What do you want to create?'}
              </h2>
            </div>
          )}

          {/* Suggestion Chips */}
          {genImages.length === 0 && !generating && !hasContent && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
              {[
                locale === 'vi' ? 'Kiếm sắt cổ đại' : 'An ancient iron sword',
                locale === 'vi' ? 'Bình thuốc hồi máu' : 'A healing potion bottle',
                locale === 'vi' ? 'Tháp canh trung cổ' : 'A medieval watchtower',
              ].map((s, i) => (
                <button
                  key={i}
                  className="btn btn-sm"
                  style={{ borderRadius: '999px', background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                  onClick={() => {
                    if (contentMode === 'multi-item') {
                      setContentItems([s]);
                    } else {
                      setContentIdea(s);
                    }
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── THE MAIN GLASS INPUT BOX ── */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-primary)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Mode Toggle inside input box */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-glass)', padding: '3px', borderRadius: '8px' }}>
                <div onClick={() => setContentMode('multi-item')} style={{ padding: '4px 10px', fontSize: '0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, background: contentMode === 'multi-item' ? 'var(--accent-primary)' : 'transparent', color: contentMode === 'multi-item' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}>Multi-Item</div>
                <div onClick={() => setContentMode('freeform')} style={{ padding: '4px 10px', fontSize: '0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, background: contentMode === 'freeform' ? 'var(--accent-primary)' : 'transparent', color: contentMode === 'freeform' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}>Free-form</div>
              </div>
            </div>

            {/* Input Area */}
            {contentMode === 'freeform' ? (
              <textarea
                placeholder={locale === 'vi' ? 'Mô tả chi tiết ý tưởng của bạn...' : 'Describe your content idea in detail...'}
                rows={3}
                value={contentIdea}
                onChange={(e) => setContentIdea(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.1rem', outline: 'none', resize: 'none', minHeight: '60px', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
            ) : (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: contentItems.length > 0 ? '12px' : '0' }}>
                  {contentItems.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(26,115,232,0.1)', border: '1px solid rgba(26,115,232,0.2)', borderRadius: '999px', padding: '6px 14px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', animation: 'fadeIn 0.2s ease-out' }}>
                      <span>{item}</span>
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 0, cursor: 'pointer', lineHeight: 1, display: 'flex' }} onClick={() => handleRemoveItem(idx)}><X size={14} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={locale === 'vi' ? 'Thêm item (VD: Iron Sword, Health Potion)...' : 'Add item (e.g. Iron Sword, Health Potion)...'}
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                    disabled={contentItems.length >= 10}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.1rem', outline: 'none', fontFamily: 'inherit' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: contentItems.length >= 10 ? 'var(--accent-danger)' : 'var(--text-muted)', flexShrink: 0 }}>{contentItems.length}/10</span>
                </div>
              </div>
            )}

            {/* Reference Images inline preview */}
            {(refRecords.length > 0 || adHocRefs.length > 0) && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', overflowX: 'auto' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, marginRight: '4px' }}>Refs ({totalSelectedRefs}/4)</span>
                {refRecords.map(r => {
                  const isSel = selectedRefIds.has(r.id);
                  return (
                    <div key={r.id} onClick={() => handleRefToggle(r.id)} style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0, cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: isSel ? '2px solid var(--accent-primary)' : '2px solid transparent', opacity: isSel ? 1 : 0.35, transition: 'all 0.2s' }}>
                      <img src={renderObjUrl(r.data)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="ref" />
                    </div>
                  );
                })}
                {adHocRefs.map(r => (
                  <div key={r.id} style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--accent-warning)' }}>
                    <img src={r.data} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="adhoc" />
                    <button onClick={(e) => { e.stopPropagation(); handeRemoveAdHoc(r.id); }} style={{ position: 'absolute', top: -1, right: -1, background: 'var(--accent-danger)', color: '#fff', fontSize: '10px', width: '16px', height: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── INLINE ADVANCED SETTINGS ── */}
            {showAdvanced && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px' }}>

                  {/* Left Column Settings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>Aspect Ratio</label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['1:1', '16:9', '9:16', '3:2'].map(ratio => (
                          <button key={ratio} className="btn btn-sm" style={{ padding: '6px 12px', background: aspectRatio === ratio ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', border: 'none', color: aspectRatio === ratio ? '#fff' : 'var(--text-secondary)', borderRadius: '999px', fontSize: '0.8rem' }} onClick={() => setAspectRatio(ratio)}>
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>Images Count</label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[1, 2, 4].map(num => (
                          <button key={num} className="btn btn-sm" style={{ padding: '6px 16px', background: sampleCount === num ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', border: 'none', color: sampleCount === num ? '#fff' : 'var(--text-secondary)', borderRadius: '999px', fontSize: '0.8rem' }} onClick={() => setSampleCount(num)}>
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>Camera Angle</label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['', 'Isometric', 'Low Angle', 'Eye-Level', 'Top-Down', "Bird's Eye", '3/4 View'].map(angle => (
                          <button key={angle} className="btn btn-sm" style={{ padding: '6px 12px', background: cameraAngle === angle ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', border: 'none', color: cameraAngle === angle ? '#fff' : 'var(--text-secondary)', borderRadius: '999px', fontSize: '0.75rem' }} onClick={() => setCameraAngle(angle)}>
                            {angle || (locale === 'vi' ? 'Mặc định' : 'Default')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column Settings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>Negative Prompt</label>
                      <textarea className="form-input" rows={2} placeholder="Things to exclude..." value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', minHeight: '60px' }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>Dominant Color</label>
                      <input type="text" className="form-input" placeholder="e.g. Neon Pink" value={dominantColor} onChange={(e) => setDominantColor(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{ borderRadius: '999px', background: showAdvanced ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Settings2 size={15} /> {locale === 'vi' ? 'Cài đặt' : 'Settings'}
                </button>
                <label
                  className="btn btn-sm"
                  style={{ borderRadius: '999px', background: 'transparent', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Paperclip size={15} /> {locale === 'vi' ? 'Đính kèm' : 'Attach'}
                  <input type="file" multiple accept="image/*" hidden onChange={handleTempRefUpload} />
                </label>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={generating || !hasContent}
                style={{
                  borderRadius: '999px',
                  padding: '10px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: hasContent ? '#fff' : 'rgba(255,255,255,0.05)',
                  color: hasContent ? '#000' : 'var(--text-muted)',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  border: 'none',
                  boxShadow: hasContent ? '0 4px 14px rgba(255,255,255,0.2)' : 'none'
                }}
              >
                {generating ? <span className="loading-spinner" style={{ width: '16px', height: '16px', borderColor: '#000', borderTopColor: 'transparent' }}></span> : <Rocket size={16} />}
                {generating ? (locale === 'vi' ? 'Đang tạo...' : 'Generating...') : (locale === 'vi' ? 'Tạo ảnh' : 'Generate')}
              </button>
            </div>
          </div>
        </div>

        {/* ── GENERATION PROGRESS ── */}
        {genProgress.length > 0 && (
          <div style={{ maxWidth: '800px', width: '100%', margin: '16px auto 0', padding: '16px 20px', background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
            {genProgress.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '13px', color: i === genProgress.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'color 200ms ease' }}>
                <span>{step}</span>
                {i === genProgress.length - 1 && generating && (
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.2s infinite' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── PROMPT REFINE PANEL ── */}
        <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
          <PromptRefinePanel
            style={style}
            settings={settings}
            locale={locale}
            genImages={genImages}
            refRecords={refRecords}
            onPromptUpdate={(updates) => onUpdate(style.id, updates)}
            showToast={showToast}
          />
        </div>

        {/* ── RESULTS GALLERY ── */}
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '24px 0 48px' }}>
          {genImages.length > 0 && (
            <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={16} /> {locale === 'vi' ? 'Kết quả' : 'Results'} ({genImages.length})
            </h3>
          )}

          {genImages.length === 0 && !generating ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {locale === 'vi' ? 'Chưa có ảnh nào. Nhập ý tưởng và nhấn Tạo ảnh.' : 'No images yet. Enter an idea and hit Generate.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {genImages.map(img => (
                <div
                  key={img.id}
                  onClick={() => setViewerImage(img)}
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 120ms ease', position: 'relative' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                >
                  <img src={renderObjUrl(img.data)} style={{ width: '100%', height: 'auto', display: 'block' }} alt="Gen result" />
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-full)', padding: '6px', display: 'flex', opacity: 0.6 }}>
                    <Maximize2 size={14} color="#F2F2F0" />
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(img.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── IMAGE VIEWER MODAL ── */}
      {viewerImage && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 200ms ease-out' }}
          onClick={() => setViewerImage(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            {/* Close button */}
            <button
              onClick={() => setViewerImage(null)}
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', zIndex: 10 }}
            >
              <X size={24} />
            </button>

            {/* Image */}
            <img
              src={renderObjUrl(viewerImage.data)}
              style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 80px)', objectFit: 'contain', borderRadius: 'var(--radius-lg)' }}
              alt="Full view"
            />

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--surface-2)', padding: '12px 24px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginRight: '8px' }}>
                {new Date(viewerImage.createdAt).toLocaleString()} · {viewerImage.aspectRatio || '1:1'}
              </span>

              {/* Download */}
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = renderObjUrl(viewerImage.data);
                  a.download = `style-gen-${viewerImage.id}.jpg`;
                  a.click();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-full)', padding: '8px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', transition: 'background 120ms ease' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <DownloadCloud size={15} /> {locale === 'vi' ? 'Tải xuống' : 'Download'}
              </button>

              {/* Edit */}
              {onRequestEdit && (
                <button
                  onClick={() => { setViewerImage(null); onRequestEdit(viewerImage.id); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-full)', padding: '8px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', transition: 'background 120ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <PenTool size={15} /> {locale === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                </button>
              )}

              {/* Promote to Ref */}
              <button
                onClick={() => { handlePromote(viewerImage); setViewerImage(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-muted)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-full)', padding: '8px 16px', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'background 120ms ease' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-muted)'; e.currentTarget.style.color = 'var(--accent)'; }}
              >
                <Star size={15} /> {locale === 'vi' ? 'Dùng làm Ref' : 'Use as Ref'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
