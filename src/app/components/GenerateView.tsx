import React, { useState, useEffect } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { callImageGen, generateId, fileToBase64 } from '@/lib/storage';
import { saveGenImage, getGenImages, getRefImages, putRefImage, type GenImageRecord, type RefImageRecord, blobToBase64 } from '@/lib/db';
import { flattenPrompt } from '@/types';
import PromptRefinePanel from '@/app/components/PromptRefinePanel';
import { Paperclip, Sparkles, Rocket, PenTool, Star, DownloadCloud } from 'lucide-react';

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
  const [cameraAngle, setCameraAngle] = useState<string>('');
  const [dominantColor, setDominantColor] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>(
    Array.isArray((style.prompt as any).negative_prompt)
      ? (style.prompt as any).negative_prompt.join(', ')
      : ((style.prompt as any).negative_prompt || '')
  );
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [sampleCount, setSampleCount] = useState<number>(1);

  const [generating, setGenerating] = useState(false);
  const [genImages, setGenImages] = useState<GenImageRecord[]>([]);

  const [refRecords, setRefRecords] = useState<RefImageRecord[]>([]);
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set());
  const [adHocRefs, setAdHocRefs] = useState<{ id: string; data: string; mimeType: string }[]>([]);

  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      // 1. Load Gen Images
      const gImgs = await getGenImages(style.id);
      if (!cancelled) setGenImages(gImgs);

      // 2. Load Refs from DB
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

    // We need to keep total <= 4. How many spots left?
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

  const handleGenerate = async () => {
    if (!contentIdea.trim()) {
      showToast(locale === 'vi' ? 'Vui lòng nhập ý tưởng nội dung (CONTENT)' : 'Please enter a content idea', 'warning');
      return;
    }

    setGenerating(true);
    try {
      const flatStyle = flattenPrompt(style.prompt as PromptSchema);

      const selectedLibRefs = refRecords.filter(r => selectedRefIds.has(r.id));
      const b64SelectedLibRefs = await Promise.all(selectedLibRefs.map(r => blobToBase64(r.data)));
      const b64Refs = [...b64SelectedLibRefs, ...adHocRefs.map(r => r.data)].slice(0, 4);

      let promptIdea = contentIdea;
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
        data: b64, // note: in future should be blob
        promptText: `[CONTENT] ${contentIdea}\n[STYLE] ${flatStyle.positive}`,
        promptJson: JSON.stringify({ MANDATORY_STYLE: flatStyle.positive, CONTENT: contentIdea }),
        createdAt: new Date().toISOString(),
        generationSource: 'imagen',
        aspectRatio: aspectRatio,
      }));

      // In V2 we save as Blob, so we need to transcode
      const { base64ToBlob } = await import('@/lib/db');
      for (const rec of newRecords) {
        rec.data = base64ToBlob(rec.data as string) as unknown as string; // Hack to reuse type temporarily, or assume GenImageRecord has 'data: any'
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
      // get Blob directly from record if it's already transcoded, else we just passed it directly to indexedDB
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

  // Convert Blob directly stored in memory to URL
  const renderObjUrl = (data: any) => {
    if (typeof data === 'string') return data; // base64 fallback
    if (data instanceof Blob) return URL.createObjectURL(data);
    return ''; // unknown
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_library')}</a>
          <h1 className="page-title">{style.name} — Generate</h1>
          <p className="page-subtitle">Test and generate new images perfectly adhering to the style.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        {/* LEFT PANEL: CONFIG */}
        <div style={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}>

          <div className="card">
            <label className="form-label" style={{ color: 'var(--accent-warning)', fontWeight: 'bold' }}>[MANDATORY STYLE INSTRUCTIONS]</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>The AI will rigidly follow this schema.</p>
            <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', maxHeight: '150px', overflowY: 'auto', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              {flattenPrompt(style.prompt as PromptSchema).positive}
            </div>
            <div style={{ marginTop: '16px', background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px' }}><Paperclip size={14} /> Ref Images ({totalSelectedRefs}/4)</label>
                <label style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', cursor: 'pointer' }}>
                  + Temp Ref
                  <input type="file" multiple accept="image/*" hidden onChange={handleTempRefUpload} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {refRecords.map(r => {
                  const isSel = selectedRefIds.has(r.id);
                  return (
                    <div key={r.id} onClick={() => handleRefToggle(r.id)} style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0, cursor: 'pointer', borderRadius: '4px', overflow: 'hidden', border: isSel ? '2px solid var(--accent-primary)' : '2px solid transparent', opacity: isSel ? 1 : 0.4, transition: 'all 0.2s' }}>
                      <img src={renderObjUrl(r.data)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="ref" />
                      {isSel && <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--accent-primary)', color: '#fff', fontSize: '10px', padding: '0 2px' }}>✓</div>}
                    </div>
                  );
                })}
                {adHocRefs.map(r => (
                  <div key={r.id} style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', border: '2px solid var(--accent-warning)', opacity: 1 }}>
                    <img src={r.data} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="adhoc" />
                    <button onClick={(e) => { e.stopPropagation(); handeRemoveAdHoc(r.id); }} style={{ position: 'absolute', top: 0, right: 0, background: 'var(--accent-danger)', color: '#fff', fontSize: '10px', width: '14px', height: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                ))}
                {refRecords.length === 0 && adHocRefs.length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No references selected</div>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ border: '2px solid var(--accent-primary)' }}>
            <label className="form-label" style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>[CONTENT IDEA] <Sparkles size={18} /></label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>What subjects/items do you want to draw in this style?</p>
            <textarea
              className="form-input"
              placeholder="A futuristic cybernetic dog sitting on a neon-lit couch..."
              rows={4}
              value={contentIdea}
              onChange={(e) => setContentIdea(e.target.value)}
            />
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Optional Overrides</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Camera Angle</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Low angle, wide shot"
                  value={cameraAngle}
                  onChange={(e) => setCameraAngle(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Dominant Color</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Neon Pink, Muted Grey"
                  value={dominantColor}
                  onChange={(e) => setDominantColor(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <label className="form-label">Negative Prompt</label>
            <textarea
              className="form-input"
              rows={2}
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              <div>
                <label className="form-label">Aspect Ratio</label>
                <select className="form-input" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                  <option value="1:1">1:1 Square</option>
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Portrait</option>
                  <option value="3:2">3:2 Photo</option>
                </select>
              </div>
              <div>
                <label className="form-label">Count</label>
                <select className="form-input" value={sampleCount} onChange={(e) => setSampleCount(Number(e.target.value))}>
                  <option value="1">1 Image</option>
                  <option value="2">2 Images</option>
                  <option value="4">4 Images</option>
                </select>
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'auto' }} onClick={handleGenerate} disabled={generating}>
            {generating ? <span className="loading-spinner"></span> : <><Rocket size={18} style={{ marginRight: '8px' }} /> Generate Image</>}
          </button>
        </div>

        {/* RIGHT PANEL: OUTPUTS */}
        <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '24px', overflowY: 'auto' }}>

          <PromptRefinePanel
            style={style}
            settings={settings}
            locale={locale}
            genImages={genImages}
            refRecords={refRecords}
            onPromptUpdate={(updates) => onUpdate(style.id, updates)}
            showToast={showToast}
          />

          <h3 style={{ marginBottom: '16px' }}>Generated Results</h3>
          {genImages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
              No generated images yet. Fill in the Content field and generate.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {genImages.map(img => (
                <div key={img.id} className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <img src={renderObjUrl(img.data)} style={{ width: '100%', height: 'auto', borderRadius: '4px', background: 'var(--bg-tertiary)' }} alt="Gen result" />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(img.createdAt).toLocaleTimeString()}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {onRequestEdit && (
                        <button className="btn btn-sm" style={{ background: 'var(--bg-glass-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => onRequestEdit(img.id)} title="Edit this image with prompts">
                          <PenTool size={14} />
                        </button>
                      )}
                      <button className="btn btn-sm" style={{ background: 'var(--bg-glass-hover)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }} onClick={() => {
                        const a = document.createElement('a');
                        a.href = renderObjUrl(img.data);
                        a.download = `style-gen-${img.id}.jpg`;
                        a.click();
                      }} title="Download Image">
                        <DownloadCloud size={14} />
                      </button>
                      <button className="btn btn-sm" style={{ background: 'var(--bg-glass-hover)', color: 'var(--accent-warning)', border: '1px solid var(--accent-warning)' }} onClick={() => handlePromote(img)} title="Mark as high-fidelity and use as a style reference">
                        <Star size={14} />
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
