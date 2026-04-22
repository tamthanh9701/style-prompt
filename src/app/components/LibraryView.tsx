import React, { useState, useEffect } from 'react';
import type { StyleLibrary } from '@/types';
import { type Locale, t } from '@/lib/i18n';
import { getRefImages, getRefImageById } from '@/lib/db';
import { ImageIcon, FileImage, PlusCircle } from 'lucide-react';

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
          objectUrl = typeof record.data === 'string' ? record.data : URL.createObjectURL(record.data);
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
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}><ImageIcon size={48} strokeWidth={1} /></div>;
  }

  return <img src={url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}

export default function LibraryView({ styles, locale, onSelect, onCreate, onDelete, role = 'admin' }: {
  styles: StyleLibrary[];
  locale: Locale;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  role?: 'admin' | 'user';
}) {
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);
  const isAdmin = role === 'admin';

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">{L('lib_title')}</h1>
          <p className="page-subtitle">{L('lib_subtitle')}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={onCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-full)', padding: '10px 24px' }}>
            <PlusCircle size={16} /> {locale === 'vi' ? 'Tạo mới' : 'New Style'}
          </button>
        )}
      </div>

      {styles.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)' }}>
          <div className="empty-state-icon" style={{ opacity: 0.5, marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><ImageIcon size={48} strokeWidth={1} color="var(--accent)" /></div>
          <h2 className="empty-state-title">{L('lib_empty_title')}</h2>
          <p className="empty-state-desc">{L('lib_empty_desc')}</p>
          <button className="btn btn-primary btn-lg" onClick={onCreate}>{L('lib_empty_btn')}</button>
        </div>
      ) : (
        <div className="styles-grid">
          {styles.map((style) => (
            <div key={style.id} className="style-card" onClick={() => onSelect(style.id)}>
              <div className="style-card-images">
                <LibraryCoverImage libraryId={style.id} coverImageId={style.coverImageId} />
                {(style.ref_image_count || 0) > 0 && (
                  <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 600 }}>
                    {style.ref_image_count}
                  </div>
                )}
              </div>
              <div className="style-card-body">
                <div className="style-card-name">{style.name}</div>
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
