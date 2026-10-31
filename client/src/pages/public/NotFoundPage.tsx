import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Home } from 'lucide-react';
import { useSeo } from '@/lib/seo';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

const SUGGESTIONS: Array<{ label: string; href: string }> = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Skills', href: '/skills' },
  { label: 'Projects', href: '/projects' },
  { label: 'Experience', href: '/experience' },
  { label: 'Achievements', href: '/achievements' },
  { label: 'Learning journey', href: '/journey' },
  { label: 'Blog', href: '/blog' },
  { label: 'Resume', href: '/resume' },
  { label: 'Contact', href: '/contact' },
];

export function NotFoundPage() {
  useSeo({ title: 'Page not found', robots: 'noindex, nofollow' }, []);

  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<Compass className="h-5 w-5" />}
        title="Page not found"
        description="The page you were looking for does not exist or has moved."
        action={
          <Link to="/">
            <Button iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>Back home</Button>
          </Link>
        }
      />

      <nav aria-label="Suggested pages" className="mx-auto mt-10 max-w-2xl">
        <h2 className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          <Home className="h-4 w-4" aria-hidden="true" /> Try one of these
        </h2>
        <ul className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((item) => (
            <li key={item.href}>
              <Link to={item.href} className="chip">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
