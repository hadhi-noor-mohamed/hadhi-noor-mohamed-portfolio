/* eslint-disable react-refresh/only-export-components -- context modules intentionally export a provider and its hook */
import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Eye, PenLine } from 'lucide-react';
import { Tabs } from './Tabs';
import { Textarea } from './Field';
import { cn } from '@/lib/utils';

/** Renders Markdown to sanitised HTML (same rules the server applies on save). */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown ?? '', { async: false }) as string;
  return DOMPurify.sanitize(html);
}

export function MarkdownEditor({
  value,
  onChange,
  rows = 16,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  label?: string;
}) {
  const [tab, setTab] = useState('write');
  const html = useMemo(() => renderMarkdown(value), [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label ? <span className="label mb-0">{label}</span> : <span />}
        <Tabs
          items={[
            { id: 'write', label: 'Write', icon: <PenLine className="h-3.5 w-3.5" aria-hidden="true" /> },
            { id: 'preview', label: 'Preview', icon: <Eye className="h-3.5 w-3.5" aria-hidden="true" /> },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'write' ? (
        <Textarea
          value={value}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-[0.85rem] leading-relaxed"
          placeholder={'# Heading\n\nWrite **Markdown** here…'}
        />
      ) : (
        <div
          className="rich-text min-h-[8rem] rounded-lg border p-4"
          style={{ borderColor: 'var(--border)' }}
          /* Content is sanitised by DOMPurify above and again on the server. */
          dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:.6">Nothing to preview yet.</p>' }}
        />
      )}
      <p className="hint">Markdown is rendered and sanitised on the server before it is stored.</p>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  rows = 12,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  label?: string;
}) {
  const [mode, setMode] = useState('write');

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    const editor = document.getElementById('rte-editor');
    if (editor) onChange(editor.innerHTML);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label ? <span className="label mb-0">{label}</span> : <span />}
        <Tabs
          items={[
            { id: 'write', label: 'Write', icon: <PenLine className="h-3.5 w-3.5" aria-hidden="true" /> },
            { id: 'preview', label: 'Preview', icon: <Eye className="h-3.5 w-3.5" aria-hidden="true" /> },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>

      {mode === 'write' ? (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-wrap gap-1 border-b p-1.5" style={{ borderColor: 'var(--border)' }}>
            {[
              { label: 'B', cmd: 'bold', title: 'Bold' },
              { label: 'I', cmd: 'italic', title: 'Italic' },
              { label: 'H2', cmd: 'formatBlock', arg: 'h2', title: 'Heading 2' },
              { label: 'H3', cmd: 'formatBlock', arg: 'h3', title: 'Heading 3' },
              { label: '¶', cmd: 'formatBlock', arg: 'p', title: 'Paragraph' },
              { label: '• List', cmd: 'insertUnorderedList', title: 'Bulleted list' },
              { label: '1. List', cmd: 'insertOrderedList', title: 'Numbered list' },
              { label: '“ ”', cmd: 'formatBlock', arg: 'blockquote', title: 'Quote' },
            ].map((tool) => (
              <button
                key={tool.label}
                type="button"
                title={tool.title}
                onClick={() => exec(tool.cmd, tool.arg)}
                className="rounded px-2 py-1 text-xs font-medium hover:bg-[color-mix(in_srgb,var(--brand-primary)_16%,transparent)]"
              >
                {tool.label}
              </button>
            ))}
            <button
              type="button"
              title="Insert link"
              onClick={() => {
                const url = window.prompt('Link URL (https://…)');
                if (url) exec('createLink', url);
              }}
              className="rounded px-2 py-1 text-xs font-medium hover:bg-[color-mix(in_srgb,var(--brand-primary)_16%,transparent)]"
            >
              Link
            </button>
          </div>
          <div
            id="rte-editor"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            onInput={(event) => onChange((event.target as HTMLDivElement).innerHTML)}
            className={cn('rich-text px-3 py-2 text-sm outline-none')}
            style={{ minHeight: `${rows * 1.6}rem` }}
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </div>
      ) : (
        <div
          className="rich-text min-h-[8rem] rounded-lg border p-4"
          style={{ borderColor: 'var(--border)' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value || '<p style="opacity:.6">Nothing to preview yet.</p>') }}
        />
      )}
      <p className="hint">Formatting is sanitised on the server before it is stored.</p>
    </div>
  );
}
