import { Plus, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Field';

/** Editor for an ordered list of short strings (e.g. project features, learnings). */
export function ListEditor({
  value,
  onChange,
  placeholder = 'Add an item',
  addLabel = 'Add item',
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const update = (index: number, next: string) => {
    onChange(value.map((item, i) => (i === index ? next : item)));
  };
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input value={item} placeholder={placeholder} onChange={(event) => update(index, event.target.value)} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            aria-label={`Remove item ${index + 1}`}
            className="shrink-0 text-red-400"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, ''])} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
        {addLabel}
      </Button>
    </div>
  );
}
