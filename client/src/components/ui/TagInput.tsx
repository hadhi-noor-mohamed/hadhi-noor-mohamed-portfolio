import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from './Field';

export function TagInput({
  value,
  onChange,
  placeholder = 'Type and press Enter',
  id,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const parts = draft
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const part of parts) if (!next.includes(part)) next.push(part);
    onChange(next);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span key={tag} className="badge badge-primary">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== tag))}
                aria-label={`Remove ${tag}`}
                className="ml-0.5 opacity-80 hover:opacity-100"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      </div>
    </div>
  );
}
