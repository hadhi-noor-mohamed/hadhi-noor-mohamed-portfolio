import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  ChevronRight,
  FolderKanban,
  Gauge,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cn, initials } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  label: string;
  href: string;
  icon: typeof Gauge;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Content',
    items: [
      { label: 'Projects', href: '/admin/projects', icon: FolderKanban },
      { label: 'Skills', href: '/admin/skills', icon: Sparkles },
      { label: 'Timeline', href: '/admin/timeline', icon: Briefcase },
      { label: 'Achievements', href: '/admin/showcase', icon: Award },
      { label: 'Learning journey', href: '/admin/journey', icon: Gauge },
      { label: 'Blog', href: '/admin/blog', icon: BookOpen },
    ],
  },
  {
    label: 'Library',
    items: [{ label: 'Media', href: '/admin/media', icon: ImageIcon }],
  },
  {
    label: 'Communication',
    items: [{ label: 'Inbox', href: '/admin/inbox', icon: Inbox }],
  },
  {
    label: 'Insights',
    items: [{ label: 'Analytics', href: '/admin/analytics', icon: BarChart3 }],
  },
  {
    label: 'Appearance',
    items: [
      { label: 'Page builder', href: '/admin/page-builder', icon: Users },
      { label: 'Theme studio', href: '/admin/theme', icon: Palette },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Profile', href: '/admin/profile', icon: UserCog },
      { label: 'SEO & settings', href: '/admin/seo', icon: Search },
      { label: 'Backup & restore', href: '/admin/backup', icon: Settings },
      { label: 'Account & security', href: '/admin/account', icon: ShieldCheck },
    ],
  },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const loadUnread = useCallback(async () => {
    try {
      const result = await api.get<{ count: number }>('/api/admin/messages/unread-count');
      setUnread(result.data.count);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    void loadUnread();
    const interval = window.setInterval(loadUnread, 60_000);
    return () => window.clearInterval(interval);
  }, [loadUnread, location.pathname]);

  const crumbs = buildCrumbs(location.pathname);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-strong)' }}
        >
          <div className="flex h-16 items-center justify-between gap-2 border-b px-4" style={{ borderColor: 'var(--border)' }}>
            <Link to="/admin" className="flex items-center gap-2 font-semibold">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundImage: 'linear-gradient(120deg, var(--brand-primary), var(--brand-accent))' }}
                aria-hidden="true"
              >
                H
              </span>
              <span className="text-sm">Portfolio CMS</span>
            </Link>
            <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close sidebar">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
            {GROUPS.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-1.5 px-3 text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <NavLink
                          to={item.href}
                          end={item.end}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                              isActive ? 'font-semibold' : 'opacity-80 hover:opacity-100',
                            )
                          }
                          style={({ isActive }) =>
                            isActive
                              ? { backgroundColor: 'color-mix(in srgb, var(--brand-primary) 16%, transparent)', color: 'var(--text)' }
                              : undefined
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="flex-1">{item.label}</span>
                          {item.href === '/admin/inbox' && unread > 0 ? (
                            <span className="badge badge-primary">{unread}</span>
                          ) : null}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 22%, transparent)' }}
                aria-hidden="true"
              >
                {initials(user?.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user?.name}</span>
                <span className="block truncate text-xs" style={{ color: 'var(--muted)' }}>
                  {user?.role === 'OWNER' ? 'Owner' : 'Editor'}
                </span>
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <Link to="/" className="btn btn-outline btn-sm flex-1 justify-center">
                View site
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void logout()}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>

        {mobileOpen ? <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" /> : null}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur lg:px-6"
            style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--surface) 88%, transparent)' }}
          >
            <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open sidebar">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex items-center gap-1.5 overflow-hidden text-sm">
                {crumbs.map((crumb, index) => (
                  <li key={crumb.href} className="flex items-center gap-1.5 whitespace-nowrap">
                    {index > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden="true" /> : null}
                    {index === crumbs.length - 1 ? (
                      <span className="font-medium">{crumb.label}</span>
                    ) : (
                      <Link to={crumb.href} className="opacity-70 transition hover:opacity-100">
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <ThemeToggle compact />
          </header>

          <main className="flex-1 p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  admin: 'Dashboard',
  profile: 'Profile',
  projects: 'Projects',
  new: 'New',
  skills: 'Skills',
  timeline: 'Timeline',
  showcase: 'Achievements',
  journey: 'Learning journey',
  blog: 'Blog',
  media: 'Media',
  inbox: 'Inbox',
  analytics: 'Analytics',
  'page-builder': 'Page builder',
  theme: 'Theme studio',
  seo: 'SEO & settings',
  backup: 'Backup & restore',
  account: 'Account & security',
};

function buildCrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: Array<{ label: string; href: string }> = [];
  let href = '';
  for (const part of parts) {
    href += `/${part}`;
    crumbs.push({ label: LABELS[part] ?? part, href });
  }
  if (crumbs.length === 0) crumbs.push({ label: 'Dashboard', href: '/admin' });
  return crumbs;
}
