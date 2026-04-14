import React, { useState, useEffect, useCallback } from 'react';
import { type Locale, t } from '@/lib/i18n';

export default function LogsView({ locale, onBack }: { locale: Locale; onBack: () => void }) {
  const [logs, setLogs] = useState<import('@/lib/logger').LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadLogs = useCallback(async () => {
    const { getLogs } = await import('@/lib/logger');
    setLogs(getLogs());
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLogs, 1500);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  const handleClear = async () => {
    const { clearLogs } = await import('@/lib/logger');
    clearLogs();
    setLogs([]);
  };

  const handleCopyAll = async () => {
    const text = filtered.map(e =>
      `[${new Date(e.timestamp).toISOString()}] [${e.level.toUpperCase()}] [${e.category}] ${e.message}` +
      (e.details ? '\n' + JSON.stringify(e.details, null, 2) : '')
    ).join('\n\n');
    await navigator.clipboard.writeText(text);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = logs.filter(e =>
    (filterLevel === 'all' || e.level === filterLevel) &&
    (filterCategory === 'all' || e.category === filterCategory)
  );

  const levelColor: Record<string, string> = {
    info:    'rgba(99,102,241,0.15)',
    success: 'rgba(16,185,129,0.15)',
    warning: 'rgba(245,158,11,0.15)',
    error:   'rgba(239,68,68,0.15)',
    debug:   'rgba(148,163,184,0.12)',
  };
  const levelText: Record<string, string> = {
    info: 'var(--accent-primary)', success: 'var(--accent-success)',
    warning: 'var(--accent-warning)', error: 'var(--accent-danger)',
    debug: 'var(--text-muted)',
  };
  const levelIcon: Record<string, string> = {
    info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', debug: '🔍',
  };
  const categoryIcon: Record<string, string> = {
    api_test: '🔑', ai_request: '🤖', settings: '⚙️',
    style: '🎨', navigation: '🧭', system: '🖥️',
  };

  const categories = ['all', 'api_test', 'ai_request', 'settings', 'style', 'navigation', 'system'];
  const levels = ['all', 'info', 'success', 'warning', 'error', 'debug'];

  return (
    <div>
      <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); onBack(); }}>
        {locale === 'vi' ? '← Quay lại thư viện' : '← Back to library'}
      </a>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">📋 {locale === 'vi' ? 'System Logs' : 'System Logs'}</h1>
          <p className="page-subtitle">
            {locale === 'vi' ? `${filtered.length} bản ghi • Theo dõi hoạt động chi tiết của hệ thống` : `${filtered.length} entries • Detailed system activity monitoring`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : ''}`}
            onClick={() => setAutoRefresh(v => !v)}
          >
            {autoRefresh ? '⏸ Auto' : '▶ Auto'}
          </button>
          <button className="btn btn-sm" onClick={loadLogs}>🔄 {locale === 'vi' ? 'Làm mới' : 'Refresh'}</button>
          <button className="btn btn-sm" onClick={handleCopyAll}>📋 {locale === 'vi' ? 'Copy all' : 'Copy all'}</button>
          <button className="btn btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={handleClear}>
            🗑️ {locale === 'vi' ? 'Xóa' : 'Clear'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>Level:</span>
          {levels.map(l => (
            <button key={l} className={`btn btn-sm ${filterLevel === l ? 'btn-primary' : ''}`}
              onClick={() => setFilterLevel(l)}
              style={{ padding: '3px 8px', fontSize: '0.75rem', textTransform: 'capitalize' }}>
              {l === 'all' ? 'All' : `${levelIcon[l]} ${l}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>Category:</span>
          {categories.map(c => (
            <button key={c} className={`btn btn-sm ${filterCategory === c ? 'btn-primary' : ''}`}
              onClick={() => setFilterCategory(c)}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
              {c === 'all' ? 'All' : `${categoryIcon[c] || ''} ${c.replace('_', ' ')}`}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
          <p style={{ color: 'var(--text-secondary)' }}>
            {locale === 'vi' ? 'Chưa có logs. Thực hiện một hành động để bắt đầu ghi log.' : 'No logs yet. Perform an action to start logging.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(entry => {
            const isExpanded = expandedIds.has(entry.id);
            const hasDetails = !!entry.details;
            const ts = new Date(entry.timestamp);
            const time = ts.toLocaleTimeString('vi-VN', { hour12: false });
            const date = ts.toLocaleDateString('vi-VN');

            return (
              <div key={entry.id}
                onClick={() => hasDetails && toggleExpand(entry.id)}
                style={{
                  background: levelColor[entry.level] || 'var(--bg-tertiary)',
                  border: `1px solid ${isExpanded ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  cursor: hasDetails ? 'pointer' : 'default',
                  transition: 'border-color 0.2s',
                }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: levelText[entry.level] }}>
                    {levelIcon[entry.level]} {entry.level.toUpperCase()}
                  </span>
                  <span style={{
                    padding: '1px 7px', borderRadius: '10px', fontSize: '0.6875rem', fontWeight: 600,
                    background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)',
                  }}>
                    {categoryIcon[entry.category] || ''} {entry.category.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', flex: 1, minWidth: '200px' }}>
                    {entry.message}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {date} {time}
                  </span>
                  {hasDetails && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  )}
                </div>

                {/* Detail panel */}
                {isExpanded && entry.details && (
                  <pre style={{
                    marginTop: '10px', padding: '10px 12px',
                    background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem', color: 'var(--text-secondary)',
                    overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}>
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Settings View
// ============================================================
