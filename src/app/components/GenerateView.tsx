import React, { useState, useEffect } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { callImageGen, generateId, fileToBase64 } from '@/lib/storage';
import { saveGenImage, getGenImages, getRefImages, putRefImage, type GenImageRecord, type RefImageRecord, blobToBase64 } from '@/lib/db';
import { flattenPrompt } from '@/types';
import PromptRefinePanel from '@/app/components/PromptRefinePanel';
import { Paperclip, Sparkles, Rocket, PenTool, Star, DownloadCloud, Settings2, ChevronDown, ChevronUp, ImageIcon, X, ArrowLeft } from 'lucide-react';

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
  const [adHocRefs, setAdHocRefs] = useState<{ id: string; data: string; mimeType: string }[]>([]);

  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

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
    try {
      const flatStyle = flattenPrompt(style.prompt as PromptSchema);
      const selectedLibRefs = refRecords.filter(r => selectedRefIds.has(r.id));
      const b64SelectedLibRefs = await Promise.all(selectedLibRefs.map(r => blobToBase64(r.data)));
      const b64Refs = [...b64SelectedLibRefs, ...adHocRefs.map(r => r.data)].slice(0, 4);

      let promptIdea = '';
      if (contentMode === 'multi-item') {
        if (contentItems.length === 0) {
          showToast(locale === 'vi' ? 'Vui lòng thêm ít nhất 1 item' : 'Please add at least 1 item', 'warning');
          setGenerating(false);
          return;
        }
        promptIdea = `game asset sheet containing ${contentItems.length} items. The items are:\n${contentItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
      } else {
        if (!contentIdea.trim()) {
          showToast(locale === 'vi' ? 'Vui lòng nhập ý tưởng nội dung' : 'Please enter a content idea', 'warning');
          setGenerating(false);
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

      const imagesB64 = await callImageGen(settings, payload, {
        negative_prompt: negativePrompt,
        aspect_ratio: aspectRatio,
        sample_count: sampleCount,
        reference_images: b64Refs
      });

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

      setGenImages(prev => [...newRecords, ...prev]);
      showToast(locale === 'vi' ? `Tạo thành công ${imagesB64.length} ảnh!` : `Generated ${imagesB64.length} images!`);
    } catch (err: any) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
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
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{style.name}</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Generate Mode</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '999px', background: 'rgba(26,115,232,0.1)', color: 'var(--accent-primary)', fontWeight: 500 }}>
            {aspectRatio} • {sampleCount} img
          </span>
          <button className="btn btn-sm" onClick={() => setShowAdvanced(!showAdvanced)} style={{ border: '1px solid var(--border-primary)', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Settings2 size={14} /> {showAdvanced ? 'Ẩn cài đặt' : 'Cài đặt'}
          </button>
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
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {locale === 'vi' ? 'Mô tả ý tưởng và AI sẽ tạo ảnh theo style của bạn.' : 'Describe your idea and AI will generate in your style.'}
              </p>
            </div>
          )}

          {/* Suggestion Chips (only when empty) */}
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
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Mode Toggle inside input box */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> Content Idea
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-glass)', padding: '3px', borderRadius: '8px' }}>
                <div onClick={() => setContentMode('multi-item')} style={{ padding: '4px 10px', fontSize: '0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, background: contentMode === 'multi-item' ? 'var(--accent-primary)' : 'transparent', color: contentMode === 'multi-item' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}>Multi-Item</div>
                <div onClick={() => setContentMode('freeform')} style={{ padding: '4px 10px', fontSize: '0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, background: contentMode === 'freeform' ? 'var(--accent-primary)' : 'transparent', color: contentMode === 'freeform' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s' }}>Free-form</div>
              </div>
            </div>

            {/* Input Area */}
            {contentMode === 'freeform' ? (
              <textarea
                placeholder={locale === 'vi' ? 'Mô tả chi tiết ý tưởng của bạn...' : 'Describe your content idea in detail...'}
                rows={4}
                value={contentIdea}
                onChange={(e) => setContentIdea(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', resize: 'none', minHeight: '80px', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
            ) : (
              <div>
                {/* Chips display */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: contentItems.length > 0 ? '12px' : '0' }}>
                  {contentItems.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(26,115,232,0.1)', border: '1px solid rgba(26,115,232,0.2)', borderRadius: '999px', padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', animation: 'fadeIn 0.2s ease-out' }}>
                      <span>{item}</span>
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 0, cursor: 'pointer', lineHeight: 1, display: 'flex' }} onClick={() => handleRemoveItem(idx)}><X size={12} /></button>
                    </div>
                  ))}
                </div>
                {/* Add input */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={locale === 'vi' ? 'Thêm item (VD: Iron Sword, Health Potion)...' : 'Add item (e.g. Iron Sword, Health Potion)...'}
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                    disabled={contentItems.length >= 10}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: contentItems.length >= 10 ? 'var(--accent-danger)' : 'var(--text-muted)', flexShrink: 0 }}>{contentItems.length}/10</span>
                </div>
              </div>
            )}

            {/* Reference Images inline preview */}
            {(refRecords.length > 0 || adHocRefs.length > 0) && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', overflowX: 'auto' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0, marginRight: '4px' }}>Refs ({totalSelectedRefs}/4)</span>
                {refRecords.map(r => {
                  const isSel = selectedRefIds.has(r.id);
                  return (
                    <div key={r.id} onClick={() => handleRefToggle(r.id)} style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0, cursor: 'pointer', borderRadius: '6px', overflow: 'hidden', border: isSel ? '2px solid var(--accent-primary)' : '2px solid transparent', opacity: isSel ? 1 : 0.35, transition: 'all 0.2s' }}>
                      <img src={renderObjUrl(r.data)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="ref" />
                    </div>
                  );
                })}
                {adHocRefs.map(r => (
                  <div key={r.id} style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', border: '2px solid var(--accent-warning)' }}>
                    <img src={r.data} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="adhoc" />
                    <button onClick={(e) => { e.stopPropagation(); handeRemoveAdHoc(r.id); }} style={{ position: 'absolute', top: -1, right: -1, background: 'var(--accent-danger)', color: '#fff', fontSize: '8px', width: '12px', height: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <label
                  className="btn btn-sm"
                  style={{ borderRadius: '999px', background: 'transparent', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Paperclip size={13} /> {locale === 'vi' ? 'Đính kèm' : 'Attach'}
                  <input type="file" multiple accept="image/*" hidden onChange={handleTempRefUpload} />
                </label>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={generating || !hasContent}
                style={{
                  borderRadius: '999px',
                  padding: '8px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: hasContent ? 'white' : 'var(--bg-tertiary)',
                  color: hasContent ? '#111' : 'var(--text-muted)',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  border: 'none',
                }}
              >
                {generating ? <span className="loading-spinner" style={{ width: '16px', height: '16px' }}></span> : <Rocket size={14} />}
                {generating ? (locale === 'vi' ? 'Đang tạo...' : 'Generating...') : (locale === 'vi' ? 'Tạo ảnh' : 'Generate')}
              </button>
            </div>
          </div>

          {/* ── ADVANCED SETTINGS (Collapsible, below input) ── */}
          {showAdvanced && (
            <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '16px', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Camera Angle</label>
                  <input type="text" className="form-input" placeholder="e.g. Low angle" value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Dominant Color</label>
                  <input type="text" className="form-input" placeholder="e.g. Neon Pink" value={dominantColor} onChange={(e) => setDominantColor(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Negative Prompt</label>
                <textarea className="form-input" rows={2} value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Aspect Ratio</label>
                  <select className="form-input" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                    <option value="1:1">1:1 Square</option>
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                    <option value="3:2">3:2 Photo</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Count</label>
                  <select className="form-input" value={sampleCount} onChange={(e) => setSampleCount(Number(e.target.value))}>
                    <option value="1">1 Image</option>
                    <option value="2">2 Images</option>
                    <option value="4">4 Images</option>
                  </select>
                </div>
              </div>

              {/* Style DNA Preview */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>Style DNA (read-only)</label>
                <div style={{ background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.7rem', maxHeight: '80px', overflowY: 'auto', fontFamily: 'monospace', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {flattenPrompt(style.prompt as PromptSchema).positive.substring(0, 300)}...
                </div>
              </div>
            </div>
          )}
        </div>

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
                <div key={img.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-primary)', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s ease' }}>
                  <img src={renderObjUrl(img.data)} style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--bg-tertiary)' }} alt="Gen result" />
                  <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(img.createdAt).toLocaleTimeString()}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {onRequestEdit && (
                        <button className="btn btn-sm" style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-primary)', borderRadius: '6px' }} onClick={() => onRequestEdit(img.id)} title="Edit">
                          <PenTool size={12} />
                        </button>
                      )}
                      <button className="btn btn-sm" style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-primary)', borderRadius: '6px', color: 'var(--accent-primary)' }} onClick={() => {
                        const a = document.createElement('a');
                        a.href = renderObjUrl(img.data);
                        a.download = `style-gen-${img.id}.jpg`;
                        a.click();
                      }} title="Download">
                        <DownloadCloud size={12} />
                      </button>
                      <button className="btn btn-sm" style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-primary)', borderRadius: '6px', color: 'var(--accent-warning)' }} onClick={() => handlePromote(img)} title="Promote">
                        <Star size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
