import React, { useState } from 'react';
import { type Locale, t } from '@/lib/i18n';

export default function FieldInput({ field, locale, value, onChange }: {
  field: { key: string; label: string; description: string; type: string; options?: string[]; placeholder?: string };
  locale: Locale;
  value: string | string[] | number | null;
  onChange: (val: string | string[] | number | null) => void;
}) {
  const [tagInput, setTagInput] = useState('');

  if (field.type === 'tags') {
    const tags = Array.isArray(value) ? value : [];
    return (
      <div className="form-group">
        <label className="form-label">{field.label}</label>
        <div className="tags-container" onClick={() => document.getElementById(`tag-${field.key}`)?.focus()}>
          {tags.map((tag, i) => (<span key={i} className="tag">{tag}<button className="tag-remove" onClick={() => onChange(tags.filter((_, idx) => idx !== i))}>×</button></span>))}
          <input id={`tag-${field.key}`} className="tags-input" placeholder={tags.length === 0 ? field.placeholder : ''} value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); onChange([...tags, tagInput.trim()]); setTagInput(''); }
              if (e.key === 'Backspace' && !tagInput && tags.length > 0) { onChange(tags.slice(0, -1)); }
            }} />
        </div>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return (<div className="form-group"><label className="form-label">{field.label}</label><textarea className="form-textarea" placeholder={field.placeholder} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} rows={3} /></div>);
  }
  if (field.type === 'number') {
    return (<div className="form-group"><label className="form-label">{field.label}</label><input className="form-input" type="number" placeholder={field.placeholder} value={value !== null && value !== undefined ? String(value) : ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} step="any" /></div>);
  }
  if (field.type === 'select' && field.options) {
    return (<div className="form-group"><label className="form-label">{field.label}</label><select className="form-select" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)}><option value="">{t(locale, 'select_placeholder')}</option>{field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>);
  }
  return (<div className="form-group"><label className="form-label">{field.label}</label><input className="form-input" placeholder={field.placeholder} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} /></div>);
}
