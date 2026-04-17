import { callImageGen } from '@/lib/storage';
import React, { useState, useEffect } from 'react';
import type { AppSettings } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { callAI } from '@/lib/storage';
import { getLogs, clearLogs, type LogEntry } from '@/lib/logger';

export default function SettingsView({ settings, locale, onBack, onSave, showToast }: {
  settings: AppSettings;
  locale: Locale;
  onBack: () => void;
  onSave: (settings: AppSettings) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'logs'>('general');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  useEffect(() => {
    if (activeTab === 'logs') {
      setLogs(getLogs());
    }
  }, [activeTab]);

  const providers: Array<{ type: 'openai' | 'anthropic' | 'openrouter' | 'litellm' | 'google' | 'vertexai'; name: string; icon: string }> = [
    { type: 'openai', name: 'OpenAI', icon: '🟢' }, { type: 'anthropic', name: 'Anthropic', icon: '🟠' },
    { type: 'openrouter', name: 'OpenRouter', icon: '🔵' }, { type: 'litellm', name: 'LiteLLM', icon: '🟣' },
    { type: 'google', name: 'Google AI Studio', icon: '🔵' },
    { type: 'vertexai', name: 'Google Vertex AI', icon: '🟡' },
  ];

  const updateProvider = (type: 'openai' | 'anthropic' | 'openrouter' | 'litellm' | 'google' | 'vertexai', field: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, providers: { ...prev.providers, [type]: { ...prev.providers[type], [field]: value } } }));
    setTestResults(prev => { const next = { ...prev }; delete next[type]; return next; });
  };

  const handleTestKey = async (type: 'openai' | 'anthropic' | 'openrouter' | 'litellm' | 'google' | 'vertexai') => {
    const config = localSettings.providers[type];
    if (!config.api_key && !(type === 'vertexai' && config.vertex_credentials)) {
      showToast(L('settings_enter_key'), 'warning'); return;
    }
    setTestingProvider(type);

    // Log test start
    const { logger, startTimer } = await import('@/lib/logger');
    const elapsed = startTimer();
    logger.info('api_test', `Testing API key for ${type}`, {
      provider: type,
      model: config.model,
      baseUrl: config.base_url,
      keyPrefix: config.api_key ? config.api_key.slice(0, 8) + '...' : 'NONE',
      hasCredentials: !!config.vertex_credentials,
    });

    try {
      const response = await fetch('/api/test-key', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: type,
          api_key: config.api_key,
          base_url: config.base_url,
          model: config.model,
          ...(type === 'vertexai' ? {
            vertex_project: config.vertex_project,
            vertex_location: config.vertex_location,
            vertex_credentials: config.vertex_credentials,
          } : {}),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setTestResults(prev => ({ ...prev, [type]: { success: true, message: data.message } }));
        showToast(L('settings_test_ok'));
        logger.success('api_test', `✅ API key test passed: ${type}`, {
          provider: type,
          message: data.message,
          elapsedMs: elapsed(),
        });
      } else {
        setTestResults(prev => ({ ...prev, [type]: { success: false, message: data.error } }));
        showToast(`${L('settings_test_fail')}${data.error}`, 'error');
        logger.error('api_test', `❌ API key test failed: ${type}`, {
          provider: type,
          error: data.error,
          elapsedMs: elapsed(),
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      setTestResults(prev => ({ ...prev, [type]: { success: false, message: msg } }));
      showToast(`${L('settings_test_fail')}${msg}`, 'error');
      logger.error('api_test', `❌ API key test exception: ${type}`, {
        provider: type,
        error: msg,
        elapsedMs: elapsed(),
      });
    } finally { setTestingProvider(null); }
  };

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>{L('back_library')}</a>
      <div className="page-header"><h1 className="page-title">{L('settings_title')}</h1><p className="page-subtitle">{L('settings_subtitle')}</p></div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', marginBottom: '24px' }}>
        <button className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General API</button>
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>System Logs</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'general' && (
          <div className="slide-in">
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">{L('settings_active_provider')}</label>
              <select className="form-select" value={localSettings.active_provider}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, active_provider: e.target.value as AppSettings['active_provider'] }))} style={{ maxWidth: '300px' }}>
                {providers.map(p => (<option key={p.type} value={p.type}>{p.icon} {p.name}</option>))}
              </select>
            </div>

            <div className="settings-grid">
              {providers.map(p => {
                const config = localSettings.providers[p.type];
                const isActive = localSettings.active_provider === p.type;
                const testResult = testResults[p.type];
                const isTesting = testingProvider === p.type;
                return (
                  <div key={p.type} className={`card provider-card ${isActive ? 'active' : ''}`}>
                    {isActive && <span className="provider-badge active">✓ Active</span>}
                    <h3 className="card-title" style={{ marginBottom: '16px' }}>{p.icon} {p.name}</h3>

                    {/* Vertex AI: Project + Location */}
                    {p.type === 'vertexai' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">{locale === 'vi' ? 'Vertex Project *' : 'Vertex Project *'}</label>
                          <input className="form-input" placeholder="my-gcp-project-id" value={config.vertex_project || ''} onChange={(e) => updateProvider(p.type, 'vertex_project', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{locale === 'vi' ? 'Vertex Location' : 'Vertex Location'}</label>
                          <input className="form-input" placeholder="us-central1" value={config.vertex_location || ''} onChange={(e) => updateProvider(p.type, 'vertex_location', e.target.value)} />
                        </div>
                      </>
                    )}

                    {/* API Key — optional label for Vertex AI */}
                    <div className="form-group">
                      <label className="form-label">
                        {L('settings_api_key')}{p.type === 'vertexai' ? <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>{locale === 'vi' ? '(tùy chọn nếu dùng Credentials)' : '(optional if using Credentials)'}</span> : null}
                      </label>
                      <input className="form-input" type="password" placeholder={p.type === 'vertexai' ? 'AIza... or OAuth2 token (optional)' : `${p.name} API key...`} value={config.api_key} onChange={(e) => updateProvider(p.type, 'api_key', e.target.value)} />
                    </div>

                    {/* Vertex AI: Credentials JSON upload */}
                    {p.type === 'vertexai' && (
                      <div className="form-group">
                        <label className="form-label">
                          {locale === 'vi' ? 'Vertex Credentials' : 'Vertex Credentials'}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>{locale === 'vi' ? '(file JSON service account)' : '(service account .json file)'}</span>
                        </label>
                        {config.vertex_credentials ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{
                              flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                              fontSize: '0.8125rem', color: 'var(--accent-success)',
                            }}>
                              ✅ {(() => { try { return JSON.parse(config.vertex_credentials).client_email || 'Credentials loaded'; } catch { return 'Credentials loaded'; } })()}
                            </div>
                            <button className="btn btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={() => updateProvider(p.type, 'vertex_credentials', '')}>
                              🗑️
                            </button>
                          </div>
                        ) : (
                          <label className="btn btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            📁 {locale === 'vi' ? 'Tải lên file .json' : 'Upload .json file'}
                            <input type="file" accept=".json" style={{ display: 'none' }} onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const text = await file.text();
                                JSON.parse(text); // validate JSON
                                updateProvider(p.type, 'vertex_credentials', text);
                                showToast(locale === 'vi' ? 'Đã tải credentials thành công!' : 'Credentials loaded successfully!');
                              } catch {
                                showToast(locale === 'vi' ? 'File JSON không hợp lệ' : 'Invalid JSON file', 'error');
                              }
                            }} />
                          </label>
                        )}
                      </div>
                    )}

                    <div className="form-group"><label className="form-label">{L('settings_base_url')}</label><input className="form-input" placeholder={p.type === 'vertexai' ? (locale === 'vi' ? 'Tự động từ Project + Location' : 'Auto from Project + Location') : 'API base URL'} value={config.base_url} onChange={(e) => updateProvider(p.type, 'base_url', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">{L('settings_model')}</label><input className="form-input" placeholder="Model name" value={config.model} onChange={(e) => updateProvider(p.type, 'model', e.target.value)} /></div>
                    <button className={`btn btn-sm ${testResult?.success ? 'btn-success' : ''}`} onClick={() => handleTestKey(p.type)} disabled={isTesting} style={{ width: '100%' }}>
                      {isTesting ? <><span className="loading-spinner"></span> {L('settings_testing')}</> : testResult ? (testResult.success ? L('settings_test_ok') : `❌ ${L('settings_test_btn')}`) : L('settings_test_btn')}
                    </button>
                    {testResult && (
                      <div style={{
                        marginTop: '8px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem',
                        background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: testResult.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                        borderLeft: `3px solid ${testResult.success ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
                      }}>{testResult.message}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Image Generation Section */}
            <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-primary)', paddingTop: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  🖼️ {locale === 'vi' ? 'Sinh ảnh (Vertex AI Gemini)' : 'Image Generation (Vertex AI Gemini)'}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                  {locale === 'vi' ? 'Cấu hình Vertex AI để sinh ảnh thật từ prompt — sử dụng Gemini Image models' : 'Configure Vertex AI to generate actual images from prompts — uses Gemini Image models'}
                </p>
              </div>

              <div className="card" style={{ marginBottom: '20px', border: localSettings.image_gen.enabled ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>🖼️ {locale === 'vi' ? 'Kích hoạt Image Generation' : 'Enable Image Generation'}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{locale === 'vi' ? 'Cho phép sinh ảnh thật bằng model Gemini Image' : 'Allow generating real images with Gemini Image models'}</div>
                  </div>
                  <button
                    className={`btn ${localSettings.image_gen.enabled ? 'btn-primary' : ''}`}
                    onClick={() => setLocalSettings(prev => ({ ...prev, image_gen: { ...prev.image_gen, enabled: !prev.image_gen.enabled } }))}
                    style={{ minWidth: '100px' }}
                  >
                    {localSettings.image_gen.enabled ? (locale === 'vi' ? '✓ Bật' : '✓ Enabled') : (locale === 'vi' ? 'Tắt' : 'Disabled')}
                  </button>
                </div>

                {localSettings.image_gen.enabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{locale === 'vi' ? 'Model sinh ảnh' : 'Image Model'} *</label>
                      <select className="form-select" value={localSettings.image_gen.model}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, image_gen: { ...prev.image_gen, model: e.target.value } }))}>
                        <option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview (Preview)</option>
                        <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview (Preview)</option>
                        <option value="gemini-2.5-flash-image">gemini-2.5-flash-image (GA)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">GCP Project ID *</label>
                      <input className="form-input" placeholder="my-gcp-project-id"
                        value={localSettings.image_gen.vertex_project}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, image_gen: { ...prev.image_gen, vertex_project: e.target.value } }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Location</label>
                      <select className="form-select" value={localSettings.image_gen.vertex_location}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, image_gen: { ...prev.image_gen, vertex_location: e.target.value } }))}>
                        <option value="global">global (Preview models)</option>
                        <option value="us-central1">us-central1</option>
                        <option value="us-east4">us-east4</option>
                        <option value="europe-west4">europe-west4</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{locale === 'vi' ? 'Tỉ lệ mặc định' : 'Default Aspect Ratio'}</label>
                      <select className="form-select" value={localSettings.image_gen.default_aspect_ratio}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, image_gen: { ...prev.image_gen, default_aspect_ratio: e.target.value } }))}>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="4:3">4:3 (Standard)</option>
                        <option value="3:4">3:4 (Portrait)</option>
                        <option value="16:9">16:9 (Widescreen)</option>
                        <option value="9:16">9:16 (Story)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{locale === 'vi' ? 'Số ảnh mỗi lần gen' : 'Images per generation'}</label>
                      <select className="form-select" value={localSettings.image_gen.default_sample_count}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, image_gen: { ...prev.image_gen, default_sample_count: Number(e.target.value) } }))}>
                        <option value={1}>1</option><option value={2}>2</option>
                        <option value={3}>3</option><option value={4}>4</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                      <label className="form-label">
                        {locale === 'vi' ? 'Service Account Credentials' : 'Service Account Credentials'}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>{locale === 'vi' ? '(file .json service account cho image gen)' : '(service account .json for image gen)'}</span>
                      </label>
                      {localSettings.image_gen.vertex_credentials ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.8125rem', color: 'var(--accent-success)' }}>
                            ✅ {(() => { try { return JSON.parse(localSettings.image_gen.vertex_credentials).client_email || 'Credentials loaded'; } catch { return 'Credentials loaded'; } })()}
                          </div>
                          <button className="btn btn-sm" style={{ color: 'var(--accent-danger)' }}
                            onClick={() => setLocalSettings(prev => ({ ...prev, image_gen: { ...prev.image_gen, vertex_credentials: '' } }))}>🗑️</button>
                        </div>
                      ) : (
                        <label className="btn btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          📁 {locale === 'vi' ? 'Tải lên service account .json' : 'Upload service account .json'}
                          <input type="file" accept=".json" style={{ display: 'none' }} onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            try {
                              const text = await file.text(); JSON.parse(text);
                              setLocalSettings(prev => ({ ...prev, image_gen: { ...prev.image_gen, vertex_credentials: text } }));
                              showToast(locale === 'vi' ? 'Đã tải Image Gen credentials!' : 'Image Gen credentials loaded!');
                            } catch { showToast(locale === 'vi' ? 'File JSON không hợp lệ' : 'Invalid JSON file', 'error'); }
                          }} />
                        </label>
                      )}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <button className="btn btn-sm" onClick={async () => {
                        if (!localSettings.image_gen.vertex_project || !localSettings.image_gen.vertex_credentials) {
                          showToast(locale === 'vi' ? 'Cần Project ID và Credentials' : 'Project ID and Credentials required', 'warning'); return;
                        }
                        showToast(locale === 'vi' ? 'Đang kiểm tra kết nối...' : 'Testing connection...');
                        try {
                          const imgs = await callImageGen({ ...localSettings, image_gen: { ...localSettings.image_gen, enabled: true } }, { MANDATORY_STYLE: 'minimalist, flat colors', CONTENT: 'A simple red circle on white background' }, { sample_count: 1, aspect_ratio: '1:1' });
                          if (imgs.length > 0) showToast(locale === 'vi' ? `✅ Thành công! Đã gen ${imgs.length} ảnh test.` : `✅ Success! Generated ${imgs.length} test image.`);
                        } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : 'Connection failed'}`, 'error'); }
                      }}>
                        🔌 {locale === 'vi' ? 'Test kết nối Image Gen' : 'Test Image Gen Connection'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="slide-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Application and API activity logs.</p>
              <button className="btn btn-sm btn-secondary" onClick={() => { clearLogs(); setLogs([]); }}>🗑️ Clear Logs</button>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px', border: '1px solid var(--border-primary)' }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No logs recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
                  {logs.map(log => (
                    <div key={log.id} style={{
                      padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${log.level === 'error' ? 'var(--accent-danger)' : log.level === 'success' ? 'var(--accent-success)' : log.level === 'warning' ? 'var(--accent-warning)' : 'var(--accent-primary)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>[{log.category}]</span>
                        <span style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>{log.message}</div>
                      {log.details && (
                        <pre style={{ marginTop: '8px', padding: '8px', background: 'var(--bg-primary)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary btn-lg" onClick={() => onSave(localSettings)}>{L('settings_save_btn')}</button>
        <button className="btn btn-lg" onClick={onBack}>{L('settings_cancel')}</button>
      </div>
    </div>
  );
}