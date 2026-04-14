import React, { useState, useEffect } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { flattenPrompt } from '@/types';
import { callImageGen, generateId, callAI } from '@/lib/storage';
import { saveGenImage } from '@/lib/db';

interface ImageStudioProps {
  styles: StyleLibrary[];
  settings: AppSettings;
  locale: Locale;
  preSelectedStyleId?: string | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function ImageStudio({ styles, settings, locale, preSelectedStyleId, showToast }: ImageStudioProps) {
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);
  const [activeTab, setActiveTab] = useState<'new' | 'transfer'>('new');
  const [selectedStyleId, setSelectedStyleId] = useState<string>(preSelectedStyleId || '');
  
  // New Image State
  const [subjectInput, setSubjectInput] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Transfer State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const selectedStyle = styles.find(s => s.id === selectedStyleId);

  const handleGenerate = async () => {
    if (!selectedStyle) {
      showToast(locale === 'vi' ? 'Vui lòng chọn một Style' : 'Please select a style', 'warning');
      return;
    }
    
    setGenerating(true);
    setGeneratedImage(null);
    try {
      // Create a modified prompt merging the style's prompt with the new subject input
      // Actually, since this is a simple text prompt gen for now, we just prepend the subject to the positive prompt
      let positive = flattenPrompt(selectedStyle.prompt).positive;
      if (subjectInput.trim()) {
        positive = `${subjectInput.trim()}, ${positive}`;
      }
      const negative = flattenPrompt(selectedStyle.prompt).negative;
      
      const res = await callImageGen(settings, positive, {
        negative_prompt: negative,
        aspect_ratio: aspectRatio
      });
      if (res && res.length > 0) {
        const b64 = res[0];
        setGeneratedImage(b64);
        
        // Save to DB
        await saveGenImage({
          id: generateId(),
          style_id: selectedStyle.id,
          data: b64,
          prompt_text: positive,
          prompt_json: JSON.stringify({
            prompt: positive,
            negative_prompt: negative,
            ...selectedStyle.prompt.generation_params,
            aspect_ratio: aspectRatio,
          }),
          created_at: new Date().toISOString(),
          generation_source: 'imagen',
          aspect_ratio: aspectRatio
        });
        showToast(locale === 'vi' ? '✅ Đã tạo & lưu ảnh!' : '✅ Generated & saved!');
      } else {
        throw new Error('No images returned');
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setSourceImage(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTransferGenerate = async () => {
      // Need AI to extract subject from source image and then combine with style
      if (!sourceImage || !selectedStyle) return;
      setGenerating(true);
      try {
          if (!extractedData) {
              setExtracting(true);
              // @ts-ignore - variantFromImage expects different args but stringify works for now
              const data = await callAI(settings, 'variantFromImage', [sourceImage], JSON.stringify(selectedStyle.prompt));
              setExtractedData(data);
              setExtracting(false);
          }
          // Combine extracted subject + style
          const positive = `${extractedData?.subject_description || 'Unknown subject'}, ${flattenPrompt(selectedStyle.prompt).positive}`;
          const negative = flattenPrompt(selectedStyle.prompt).negative;
          
          const res = await callImageGen(settings, positive, {
            negative_prompt: negative,
            aspect_ratio: aspectRatio
          });
          
          if (res && res.length > 0) {
              const b64 = res[0];
              setGeneratedImage(b64);
              
              await saveGenImage({
                id: generateId(),
                style_id: selectedStyle.id,
                data: b64,
                prompt_text: positive,
                prompt_json: JSON.stringify({
                  prompt: positive,
                  is_style_transfer: true,
                  aspect_ratio: aspectRatio,
                }),
                created_at: new Date().toISOString(),
                generation_source: 'imagen',
                aspect_ratio: aspectRatio
              });
              showToast('✅ Transfer successful!');
          }
      } catch (err) {
          showToast((err as Error).message, 'error');
          setExtracting(false);
      } finally {
          setGenerating(false);
      }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🎨 Image Studio</h1>
        <p className="page-subtitle">{locale === 'vi' ? 'Tạo ảnh mới với các prompt siêu cấp' : 'Create new images with your super prompts'}</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>{locale === 'vi' ? 'Ảnh Mới' : 'New Image'}</button>
        <button className={`tab ${activeTab === 'transfer' ? 'active' : ''}`} onClick={() => setActiveTab('transfer')}>{locale === 'vi' ? 'Chuyển Style' : 'Style Transfer'}</button>
      </div>

      <div className="two-col-layout">
        <div className="main-col">
          <div className="card">
            
            <div className="form-group">
              <label className="form-label">{locale === 'vi' ? 'Chọn Style' : 'Select Style'}</label>
              <select className="form-select" value={selectedStyleId} onChange={e => setSelectedStyleId(e.target.value)}>
                <option value="">-- {locale === 'vi' ? 'Chọn một Style' : 'Select a Style'} --</option>
                {styles.map(s => <option key={s.id} value={s.id}>{s.name} (v{s.version || 1})</option>)}
              </select>
            </div>

            {activeTab === 'new' && (
              <div className="form-group slide-in">
                <label className="form-label">{locale === 'vi' ? 'Chủ thể mô tả nhanh' : 'Quick Subject Description'}</label>
                <textarea className="form-textarea" rows={3} placeholder={locale === 'vi' ? 'VD: Một con mèo mặc giáp, cầm kiếm laser...' : 'E.g: A cat wearing armor, holding a lightsaber...'}
                  value={subjectInput} onChange={e => setSubjectInput(e.target.value)} />
              </div>
            )}

            {activeTab === 'transfer' && (
              <div className="form-group slide-in">
                <label className="form-label">{locale === 'vi' ? 'Ảnh nguồn' : 'Source Image'}</label>
                <div style={{ padding: '20px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  {sourceImage ? (
                    <div>
                      <img src={sourceImage} alt="Source" style={{ maxHeight: '150px', borderRadius: 'var(--radius-sm)' }} />
                      <div style={{ marginTop: '10px' }}>
                        <button className="btn btn-sm" onClick={() => setSourceImage(null)}>✕ Xóa ảnh</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📷</div>
                      <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                        Upload
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSourceUpload} />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{locale === 'vi' ? 'Tỉ lệ ảnh' : 'Aspect Ratio'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['1:1', '16:9', '9:16', '3:4', '4:3'].map(ar => (
                  <button key={ar} className={`btn btn-sm ${aspectRatio === ar ? 'btn-primary' : ''}`} onClick={() => setAspectRatio(ar)}>
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            <button 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%', marginTop: '16px' }}
              disabled={generating || !selectedStyleId || (activeTab === 'transfer' && !sourceImage)}
              onClick={activeTab === 'new' ? handleGenerate : handleTransferGenerate}
            >
              {generating ? (
                <><span className="loading-spinner"></span> {locale === 'vi' ? 'Đang tạo ảnh...' : 'Generating...'}</>
              ) : (
                <>✨ {locale === 'vi' ? 'Tạo Ảnh' : 'Generate'}</>
              )}
            </button>

            {extracting && (
               <div style={{ marginTop: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  🤖 {locale === 'vi' ? 'AI đang phân tích và bóc tách chủ thể...' : 'AI is extracting subject...'}
               </div>
            )}
          </div>
        </div>

        <div className="side-col">
          <div className="card" style={{ position: 'sticky', top: '24px', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {generatedImage ? (
                <div style={{ width: '100%' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                     <h3 className="card-title" style={{ margin: 0 }}>Result</h3>
                     <a href={generatedImage} download={`generated_${new Date().getTime()}.png`} className="btn btn-sm">💾 Save</a>
                   </div>
                   <img src={generatedImage} alt="Generated" style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-md)' }} />
                </div>
             ) : generating ? (
                <div style={{ textAlign: 'center' }}>
                   <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px auto', borderTopColor: 'var(--accent-primary)' }}></div>
                   <div style={{ color: 'var(--text-secondary)' }}>{locale === 'vi' ? 'Đang gọi sức mạnh AI...' : 'Summoning AI power...'}</div>
                </div>
             ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                   <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>🖼️</div>
                   {locale === 'vi' ? 'Ảnh tạo ra sẽ hiển thị ở đây' : 'Generated image will appear here'}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
