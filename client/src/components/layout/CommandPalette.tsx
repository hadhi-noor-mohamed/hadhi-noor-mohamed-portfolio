import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, Briefcase, FileText, FolderKanban, Home, Search, Sparkles, User } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSite } from '@/context/SiteContext';
import type { SearchResult } from '@/types/api';

const TYPE_META: Record<SearchResult['type'], { label: string; href: (slug: string) => string }> = {
  project: { label: 'Project', href: (slug) => `/projects/${slug}` },
  blog: { label: 'Blog post', href: (slug) => `/blog/${slug}` },
  journey: { label: 'Journey', href: (slug) => `/journey/${slug}` },
  skill: { label: 'Skill', href: () => '/skills' },
};

const QUICK_LINKS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'About', href: '/about', icon: User },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Skills', href: '/skills', icon: Sparkles },
  { label: 'Experience', href: '/experience', icon: Briefcase },
  { label: 'Achievements', href: '/achievements', icon: Award },
  { label: 'Blog', href: '/blog', icon: BookOpen },
  { label: 'Resume', href: '/resume', icon: FileText },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { navigation } = useSite();

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.getList<SearchResult>('/api/public/search', { q: term, pageSize: 12 });
        if (!cancelled) setResults(result.items);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const quickLinks = useMemo(() => {
    const navLinks = navigation.map((item) => ({ label: item.label, href: item.href, icon: Sparkles }));
    return [...QUICK_LINKS, ...navLinks].filter((link, index, all) => all.findIndex((l) => l.href === link.href) === index);
  }, [navigation]);

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  const filteredQuick = query.trim()
    ? quickLinks.filter((link) => link.label.toLowerCase().includes(query.trim().toLowerCase()))
    : quickLinks;

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Search" size="lg">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, posts, journey entries and pages…"
          className="input pl-9"
          aria-label="Search"
        />
      </div>

      <div className="mt-4 max-h-[55vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : query.trim().length >= 2 && results.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
            No results for “{query.trim()}”.
          </p>
        ) : null}

        {results.length > 0 ? (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Content
            </p>
            <ul className="space-y-1">
              {results.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => go(TYPE_META[item.type].href(item.slug))}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]"
                  >
                    <span className="badge badge-primary shrink-0">{TYPE_META[item.type].label}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      {item.description ? (
                        <span className="block truncate text-xs" style={{ color: 'var(--muted)' }}>
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {filteredQuick.length > 0 ? (
          <>
            <p className={cn('mb-2 text-xs font-semibold uppercase tracking-wide', results.length && 'mt-4')} style={{ color: 'var(--muted)' }}>
              Jump to
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {filteredQuick.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <button
                      type="button"
                      onClick={() => go(link.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]"
                    >
                      <Icon className="h-4 w-4 opacity-70" aria-hidden="true" />
                      {link.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>

      <p className="mt-4 text-center text-xs" style={{ color: 'var(--muted)' }}>
        Press <kbd className="rounded border px-1" style={{ borderColor: 'var(--border)' }}>Esc</kbd> to close
      </p>
    </Modal>
  );
}
