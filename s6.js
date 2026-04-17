const fs = require('fs');

let content = fs.readFileSync('src/app/components/EditStyleView.tsx', 'utf8');

// 1. Add genImages state
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'editor' | 'output' | 'json' | 'images'>('editor');",
  "const [activeTab, setActiveTab] = useState<'editor' | 'output' | 'json' | 'images'>('editor');\n  const [genImages, setGenImages] = useState<GenImageRecord[]>([]);"
);

content = content.replace(
  "// Load reference images from IndexedDB on mount",
  "// Load reference images & gen images from IndexedDB on mount"
);

content = content.replace(
  "getRefImageData(style.id).then((imgs: string[]) => {\n      if (!cancelled) { setRefImagesState(imgs); setLoadingImages(false); }\n    });",
  "getRefImageData(style.id).then((imgs: string[]) => {\n      if (!cancelled) { setRefImagesState(imgs); setLoadingImages(false); }\n    });\n    getGenImages(style.id).then(imgs => {\n      if (!cancelled) { setGenImages(imgs); }\n    });"
);

// 2. Add 'images' tab button
content = content.replace(
  "<button className={`tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>{L('edit_tab_json')}</button>\n      </div>",
  "<button className={`tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>{L('edit_tab_json')}</button>\n        <button className={`tab ${activeTab === 'images' ? 'active' : ''}`} onClick={() => setActiveTab('images')}>🖼️ {locale === 'vi' ? 'Ảnh Đã Giả lập' : 'Generated'}</button>\n      </div>"
);

// 3. Add handler functions for GenImages
content = content.replace(
  "const handleReanalyze = async () => {",
  `const handleDeleteGenImage = async (imgId: string) => {\n    await deleteGenImage(imgId);\n    setGenImages(prev => prev.filter(i => i.id !== imgId));\n    showToast(locale === 'vi' ? 'Đã xóa ảnh' : 'Image deleted');\n  };\n\n  const handleMakeVariant = (img: GenImageRecord) => {\n    try {\n       const params = img.params;\n       if (!params) return;\n       // To properly do this, we'd merge params back to prompt\n       // For simplicity, we just navigate to Generate/Variant with this genImage context, or we apply the prompt_text back!\n       // Assuming params is the generation_params used.\n       alert('Feature coming soon: Pre-fills variant fields!');\n    } catch(e) {}\n  };\n\n  const handleReanalyze = async () => {`
);

// 4. Add the JSX for activeTab === 'images'
const imagesTabJSX = `
      {activeTab === 'images' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{locale === 'vi' ? 'Ảnh Đã Tạo Gần Đây' : 'Recently Generated Images'}</h3>
          </div>
          {genImages.length === 0 ? (
             <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
               {locale === 'vi' ? 'Chưa có ảnh nào được tạo cho style này' : 'No images generated for this style yet'}
             </div>
          ) : (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
               {genImages.map(img => (
                 <div key={img.id} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                   <div style={{ width: '100%', aspectRatio: img.aspect_ratio ? img.aspect_ratio.replace(':', '/') : '1/1', background: '#000' }}>
                     <img src={img.data || img.base64} alt="Gen" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                   </div>
                   <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>Prompt:</div>
                        <div style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                           {img.prompt_text || (img.params ? img.params.prompt : '')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {new Date(img.created_at).toLocaleDateString()}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-sm" onClick={() => handleDeleteGenImage(img.id)} title="Delete">🗑️</button>
                        </div>
                      </div>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      )}
`;

content = content.replace(
  "{activeTab === 'json' && (",
  imagesTabJSX + "\n      {activeTab === 'json' && ("
);

fs.writeFileSync('src/app/components/EditStyleView.tsx', content);
console.log('S6 implemented in EditStyleView');
