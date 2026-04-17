const fs = require('fs');
const file = 'src/app/components/GenerateView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const targetStart = '{/* ── INPUT PANEL (Sidebar or Bottom) ── */}';
const targetEnd = '{/* ── CANVAS AREA (Gallery) ── */}';

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

const replacement = `{/* ── INPUT PANEL (Sidebar or Bottom) ── */}
        <div
          className={inputLayout === 'sidebar' ? "" : "custom-scrollbar"}
          style={
            inputLayout === 'sidebar'
              ? {
                width: '320px',
                height: '100%',
                borderRight: '1px solid rgba(0,0,0,0.08)',
                background: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                position: 'relative',
                zIndex: 10,
                color: '#111'
              }
              : {
                position: 'absolute',
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 48px)',
                maxWidth: '720px',
                maxHeight: '70vh',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '16px',
                padding: '20px 24px',
                overflowY: 'auto',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                zIndex: 50,
                color: '#111',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }
          }
        >
          {/* Top Section / Refine Panel (Only scrollable in sidebar mode) */}
          <div className={inputLayout === 'sidebar' ? "custom-scrollbar" : ""} style={{ flex: inputLayout === 'sidebar' ? 1 : 'none', overflowY: inputLayout === 'sidebar' ? 'auto' : 'visible', padding: inputLayout === 'sidebar' ? '24px 24px 0' : '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inputLayout === 'sidebar' && (
              <div style={{ width: '100%', paddingBottom: '16px' }}>
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
            )}
            
            {/* ── GENERATION PROGRESS ── */}
            {genProgress.length > 0 && (
              <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', marginBottom: inputLayout === 'sidebar' ? '16px' : '0' }}>
                {genProgress.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0', fontSize: '12px', color: i === genProgress.length - 1 ? '#111' : '#666', transition: 'color 200ms ease' }}>
                    <span>{step}</span>
                    {i === genProgress.length - 1 && generating && (
                      <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#714DE8', animation: 'pulse 1.2s infinite' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── THE MAIN RECRAFT-STYLE INPUT BOX ── */}
          <div style={{ padding: inputLayout === 'sidebar' ? '0 24px 24px 24px' : '0' }}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '16px',
                padding: '12px',
                boxShadow: inputLayout === 'sidebar' ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Input Area */}
              {contentMode === 'freeform' ? (
                <textarea
                  placeholder={locale === 'vi' ? 'Describe what you want to generate...' : 'Describe what you want to generate...'}
                  rows={2}
                  value={contentIdea}
                  onChange={(e) => setContentIdea(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#111', fontSize: '0.95rem', outline: 'none', resize: 'none', minHeight: '44px', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
              ) : (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: contentItems.length > 0 ? '12px' : '0' }}>
                    {contentItems.map((item, idx) => (
                      <div key={idx} style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '999px', padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#111' }}>
                        <span>{item}</span>
                        <button style={{ background: 'transparent', border: 'none', color: '#666', padding: 0, cursor: 'pointer', lineHeight: 1, display: 'flex' }} onClick={() => handleRemoveItem(idx)}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder={locale === 'vi' ? 'Add item (e.g. Iron Sword)...' : 'Add item (e.g. Iron Sword)...'}
                      value={newItemText}
                      onChange={e => setNewItemText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                      disabled={contentItems.length >= 10}
                      style={{ flex: 1, background: 'transparent', border: 'none', color: '#111', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: contentItems.length >= 10 ? 'var(--accent-danger)' : '#999', flexShrink: 0 }}>{contentItems.length}/10</span>
                  </div>
                </div>
              )}

              {/* Reference Images inline preview */}
              {(refRecords.length > 0 || adHocRefs.length > 0) && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.04)', alignItems: 'center', overflowX: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', color: '#666', flexShrink: 0, marginRight: '4px' }}>Refs</span>
                  {refRecords.map(r => {
                    const isSel = selectedRefIds.has(r.id);
                    return (
                      <div key={r.id} onClick={() => handleRefToggle(r.id)} style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0, cursor: 'pointer', borderRadius: '4px', overflow: 'hidden', border: isSel ? '2px solid #714DE8' : '2px solid transparent', opacity: isSel ? 1 : 0.4, transition: 'all 0.2s' }}>
                        <img src={renderObjUrl(r.data)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="ref" />
                      </div>
                    );
                  })}
                  {adHocRefs.map(r => (
                    <div key={r.id} style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', border: '2px solid #FF5A5F' }}>
                      <img src={r.data} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="adhoc" />
                      <button onClick={(e) => { e.stopPropagation(); handeRemoveAdHoc(r.id); }} style={{ position: 'absolute', top: -1, right: -1, background: '#FF5A5F', color: '#fff', fontSize: '8px', width: '12px', height: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Action Bar (Toolbar) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="hide-scrollbar">
                  
                  {/* Mode Pill */}
                  <button onClick={() => setContentMode(contentMode === 'freeform' ? 'multi-item' : 'freeform')}
                    style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                    {contentMode === 'freeform' ? 'Free-form' : 'Multi-Item'}
                  </button>

                  {/* Auto-suggest Aspect Ratio wrapper */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ padding: '4px 6px', fontSize: '0.75rem', color: '#666', borderRight: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center' }}><Settings2 size={12} /></div>
                    <select
                      value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}
                      style={{ background: 'transparent', border: 'none', padding: '4px 8px', fontSize: '0.75rem', color: '#333', cursor: 'pointer', outline: 'none', fontWeight: 500 }}>
                      <option value="1:1">1:1</option>
                      <option value="16:9">16:9</option>
                      <option value="9:16">9:16</option>
                      <option value="3:2">3:2</option>
                    </select>
                  </div>

                  <select
                    value={sampleCount} onChange={e => setSampleCount(Number(e.target.value))}
                    style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', color: '#333', cursor: 'pointer', outline: 'none', fontWeight: 500 }}>
                    <option value={1}>Count: 1</option>
                    <option value={2}>Count: 2</option>
                    <option value={4}>Count: 4</option>
                  </select>

                  <select
                    value={cameraAngle} onChange={e => setCameraAngle(e.target.value)}
                    style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', color: '#333', cursor: 'pointer', outline: 'none', fontWeight: 500 }}>
                    <option value="">Angle: Default</option>
                    <option value="Isometric">Isometric</option>
                    <option value="Low Angle">Low Angle</option>
                    <option value="Eye-Level">Eye-Level</option>
                    <option value="Top-Down">Top-Down</option>
                    <option value="Bird\'s Eye">Bird\'s Eye</option>
                    <option value="3/4 View">3/4 View</option>
                  </select>

                  <label style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                    <Paperclip size={12} style={{ marginRight: 4 }} /> Attach
                    <input type="file" multiple accept="image/*" hidden onChange={handleTempRefUpload} />
                  </label>
                </div>

                <div style={{ paddingLeft: '12px' }}>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !hasContent}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: hasContent ? '#111' : '#E5E5E5',
                      color: hasContent ? '#FFF' : '#A0A0A0',
                      border: 'none', cursor: hasContent ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0,
                      boxShadow: hasContent ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                    }}
                  >
                    {generating ? <span className="loading-spinner" style={{ width: '12px', height: '12px', borderColor: '#FFF', borderTopColor: 'transparent' }}></span> : <Rocket size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(file, content);
console.log('Replaced successfully');
