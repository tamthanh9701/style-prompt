import React, { useState } from 'react';
import type { StyleLibrary, StyleStatus } from '@/types';
import { type Locale, t } from '@/lib/i18n';

export default function LibraryView({ styles, locale, onSelect, onCreate, onDelete }: {
  styles: StyleLibrary[];
  locale: Locale;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);
  const [statusFilter, setStatusFilter] = useState<StyleStatus | 'all'>('all');
  const filteredStyles = statusFilter === 'all' ? styles.filter(s => (s.status || 'active') !== 'deprecated') : styles.filter(s => (s.status || 'active') === statusFilter);
  const statusBadge = (status: StyleStatus) => {
    const map: Record<StyleStatus, { emoji: string; color: string; label: string }> = {
      draft: { emoji: '🟡', color: 'rgba(234,179,8,0.15)', label: 'Draft' },
      active: { emoji: '🟢', color: 'rgba(34,197,94,0.15)', label: 'Active' },
      deprecated: { emoji: '⚫', color: 'rgba(100,100,100,0.15)', label: 'Deprecated' },
    };
    const s = map[status] || map.active;
    return <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: s.color, whiteSpace: 'nowrap' }}>{s.emoji} {s.label}</span>;
  };
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{L('lib_title')}</h1><p className="page-subtitle">{L('lib_subtitle')}</p></div>
      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'active', 'draft', 'deprecated'] as const).map(f => (
          <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : ''}`}
            onClick={() => setStatusFilter(f)}
            style={{ fontSize: '0.8rem' }}>
            {f === 'all' ? (locale === 'vi' ? '📋 Tất cả' : '📋 All') : f === 'active' ? '🟢 Active' : f === 'draft' ? '🟡 Draft' : '⚫ Deprecated'}
          </button>
        ))}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {filteredStyles.length} / {styles.length} styles
        </span>
      </div>
      {filteredStyles.length === 0 && styles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <h2 className="empty-state-title">{L('lib_empty_title')}</h2>
          <p className="empty-state-desc">{L('lib_empty_desc')}</p>
          <button className="btn btn-primary btn-lg" onClick={onCreate}>{L('lib_empty_btn')}</button>
        </div>
      ) : (
        <div className="styles-grid">
          {filteredStyles.map((style) => (
            <div key={style.id} className="style-card" onClick={() => onSelect(style.id)}
              style={(style.status || 'active') === 'deprecated' ? { opacity: 0.6 } : undefined}>
              <div className="style-card-images">
                {/* Thumbnail placeholder — images in IndexedDB, load on demand */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '2rem' }}>🖼️</div>
                {(style.ref_image_count || 0) > 0 && (
                  <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 600 }}>
                    {style.ref_image_count}
                  </div>
                )}
              </div>
              <div className="style-card-body">
                <div className="style-card-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {style.name}
                  {statusBadge(style.status || 'active')}
                </div>
                <div className="style-card-meta">
                  <span className="style-card-badge">{style.prompt.subject_type}</span>
                  <span style={{ fontSize: '0.7rem' }}>v{style.version || 1}</span>
                  <span>{style.ref_image_count || 0} {L('lib_images')}</span>
                  <span>{new Date(style.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
