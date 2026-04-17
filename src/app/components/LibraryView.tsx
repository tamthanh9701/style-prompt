import React, { useState, useEffect } from 'react';
import type { StyleLibrary, StyleStatus } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { getRefImages, getRefImageById } from '@/lib/db';
import { ImageIcon, CircleDot, CheckCircle2, XCircle, List, FileImage } from 'lucide-react';

function LibraryCoverImage({ libraryId, coverImageId }: { libraryId: string, coverImageId: string | null | undefined }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    async function loadCover() {
      try {
        let record = coverImageId ? await getRefImageById(coverImageId) : undefined;
        if (!record) {
          const refs = await getRefImages(libraryId);
          if (refs.length > 0) record = refs[0];
        }
        if (record && isMounted) {
          objectUrl = URL.createObjectURL(record.data);
          setUrl(objectUrl);
        }
      } catch (err) {
        console.error("Failed to load cover image", err);
      }
    }

    loadCover();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [libraryId, coverImageId]);

  if (!url) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--border-hover)' }}><ImageIcon size={48} strokeWidth={1} /></div>;
  }

  return <img src={url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}

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
    const map: Record<StyleStatus, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
      draft: { icon: <CircleDot size={12} />, color: '#EAB308', bg: 'rgba(234,179,8,0.15)', label: 'Draft' },
      active: { icon: <CheckCircle2 size={12} />, color: '#22C55E', bg: 'rgba(34,197,94,0.15)', label: 'Active' },
      deprecated: { icon: <XCircle size={12} />, color: '#64748B', bg: 'rgba(100,100,100,0.15)', label: 'Deprecated' },
    };
    const s = map[status] || map.active;
    return <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontWeight: 500 }}>{s.icon} {s.label}</span>;
  };
  return (
    <div>
      <div className="page-header"><h1 className="page-title">{L('lib_title')}</h1><p className="page-subtitle">{L('lib_subtitle')}</p></div>
      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'active', 'draft', 'deprecated'] as const).map(f => (
          <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : ''}`}
            onClick={() => setStatusFilter(f)}
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {f === 'all' ? <><List size={14} /> {locale === 'vi' ? 'Tất cả' : 'All'}</> :
              f === 'active' ? <><CheckCircle2 size={14} /> Active</> :
                f === 'draft' ? <><CircleDot size={14} /> Draft</> :
                  <><XCircle size={14} /> Deprecated</>}
          </button>
        ))}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {filteredStyles.length} / {styles.length} styles
        </span>
      </div>
      {filteredStyles.length === 0 && styles.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
          <div className="empty-state-icon" style={{ opacity: 0.5, marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><ImageIcon size={48} strokeWidth={1} color="var(--accent-primary)" /></div>
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
                <LibraryCoverImage libraryId={style.id} coverImageId={style.coverImageId} />
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
                  <span className="style-card-badge">{style.prompt.subject_type || 'Custom'}</span>
                  <span style={{ fontSize: '0.7rem' }}>v{style.version || 1}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FileImage size={12} /> {style.ref_image_count || 0} {L('lib_images')}</span>
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
