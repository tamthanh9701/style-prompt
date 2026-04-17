import React, { useState, useEffect } from 'react';
import type { StyleLibrary, AppSettings } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { callImageGen, generateId } from '@/lib/storage';
import { saveGenImage, getGenImages, type GenImageRecord, blobToBase64 } from '@/lib/db';

export default function ImageEditView({ style, settings, locale, imageId, onBack, onUpdate, showToast }: {
  style: StyleLibrary;
  settings: AppSettings;
  locale: Locale;
  imageId: string | null;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<StyleLibrary>) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [sourceImage, setSourceImage] = useState<GenImageRecord | null>(null);
  const [instruction, setInstruction] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [editedImages, setEditedImages] = useState<GenImageRecord[]>([]);

  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  useEffect(() => {
    async function loadData() {
      // Load Gen Images to find the specific source one and any previous edits
      const gImgs = await getGenImages(style.id);

      const specificImg = gImgs.find(g => g.id === imageId);
      if (specificImg) {
        setSourceImage(specificImg);
      } else {
        // Fallback: pick the first one if we can't find it or if none provided
        if (gImgs.length > 0) setSourceImage(gImgs[0]);
      }

      // Load all edits that came from this source image. 
      // For now we just load all generated images that were "edits"
      setEditedImages(gImgs.filter(g => g.generationSource === 'edit').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
    loadData();
  }, [style.id, imageId]);

  const handleEdit = async () => {
    if (!instruction.trim()) {
      showToast('Please enter an edit instruction', 'warning');
      return;
    }
    if (!sourceImage) return;

    setEditing(true);
    try {
      // Ensure we have base64 format for the API
      let b64Source = sourceImage.data as unknown as string;
      if (sourceImage.data instanceof Blob) {
        b64Source = await blobToBase64(sourceImage.data);
      }

      const imagesB64 = await callImageGen(
        settings,
        { MANDATORY_STYLE: instruction, CONTENT: 'Edit image: ' + instruction },
        { reference_images: [b64Source] }
      );

      const newRecords: GenImageRecord[] = imagesB64.map((b64: string) => ({
        id: `gen_${generateId()}`,
        libraryId: style.id,
        data: b64,
        promptText: `[EDITED] ${instruction}`,
        promptJson: JSON.stringify({ instruction, sourceId: sourceImage.id }),
        createdAt: new Date().toISOString(),
        generationSource: 'edit',
        aspectRatio: sourceImage.aspectRatio || '1:1',
      }));

      // In V2 we save as Blob, transcode
      try {
        const { base64ToBlob } = await import('@/lib/db');
        for (const rec of newRecords) {
          rec.data = base64ToBlob(rec.data as string) as unknown as string;
          await saveGenImage(rec);
        }
      } catch (e) {
        console.warn("Blob saving failed, fallback to string", e);
      }

      setEditedImages(prev => [...newRecords, ...prev]);
      showToast(locale === 'vi' ? 'Sửa ảnh thành công!' : 'Image edited successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Editing failed', 'error');
    } finally {
      setEditing(false);
    }
  };

  const renderObjUrl = (data: any) => {
    if (typeof data === 'string') return data;
    if (data instanceof Blob) return URL.createObjectURL(data);
    return '';
  };

  if (!sourceImage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No image found to edit. Please generate an image first.
        <br /><br />
        <button className="btn btn-secondary" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>← Back to GENERATE</a>
          <h1 className="page-title">{style.name} — Edit Image</h1>
          <p className="page-subtitle">Describe how you want to alter the image.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        {/* LEFT PANEL: CONFIG */}
        <div style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}>

          <div className="card">
            <label className="form-label">Source Image</label>
            <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <img src={renderObjUrl(sourceImage.data)} style={{ width: '100%', borderRadius: '4px', maxHeight: '300px', objectFit: 'contain' }} alt="Source" />
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ID: {sourceImage.id}
            </div>
          </div>

          <div className="card" style={{ border: '2px solid var(--accent-primary)', flex: 1 }}>
            <label className="form-label" style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>[EDIT INSTRUCTIONS] 🖌️</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>What should change? (e.g. "make the sky dark red", "add a futuristic visor to the dog").</p>
            <textarea
              className="form-input"
              placeholder="Change the lighting to cinematic neon purple..."
              rows={5}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleEdit} disabled={editing}>
            {editing ? <span className="loading-spinner"></span> : '✨ Execute Edit'}
          </button>
        </div>

        {/* RIGHT PANEL: OUTPUTS */}
        <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '24px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '16px' }}>Edited Results</h3>
          {editedImages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
              No edits generated yet. Fill in the instructions and execute.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {editedImages.map(img => (
                <div key={img.id} className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <img src={renderObjUrl(img.data)} style={{ width: '100%', height: 'auto', borderRadius: '4px', background: 'var(--bg-tertiary)' }} alt="Gen result" />
                  <div style={{ fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '8px', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Instruction:</span><br />
                    {img.promptJson ? JSON.parse(img.promptJson).instruction : ''}
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
