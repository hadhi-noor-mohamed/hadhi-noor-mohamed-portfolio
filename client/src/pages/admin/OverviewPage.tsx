import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Circle,
  FolderKanban,
  Image as ImageIcon,
  Inbox,
  Sparkles,
  UserCog,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, timeAgo } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminPageHeader, StatCard, AdminSection } from '@/components/admin/AdminUI';
import type { Overview } from '@/types/api';

export function AdminOverviewPage() {
  const { user } = useAuth();
  const query = useAsync<Overview>(() => api.get<Overview>('/api/admin/overview').then((r) => r.data), []);
  const data = query.data;

  return (
    <div>
      <AdminPageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="A snapshot of your content and what needs attention."
        actions={
          <>
            <Link to="/" className="btn btn-outline btn-sm">
              View public site
            </Link>
            <Link to="/admin/projects/new" className="btn btn-primary btn-sm">
              New project
            </Link>
          </>
        }
      />

      {query.loading ? (
        <LoadingBlock label="Loading dashboard…" />
      ) : query.error || !data ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="Dashboard unavailable"
          description="We could not load the overview. Please refresh the page."
          action={<Button onClick={() => void query.reload()}>Retry</Button>}
        />
      ) : (
        <div className="space-y-6">
          <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Projects"
              value={data.counts.projectsPublished}
              hint={`${data.counts.projectsTotal} total · ${data.counts.projectsDraft} draft`}
              icon={<FolderKanban className="h-4 w-4" />}
            />
            <StatCard label="Skills" value={data.counts.skills} hint={`${data.counts.categories} categories`} icon={<Sparkles className="h-4 w-4" />} />
            <StatCard
              label="Blog posts"
              value={data.counts.postsPublished}
              hint={`${data.counts.posts} total`}
              icon={<BookOpen className="h-4 w-4" />}
            />
            <StatCard
              label="Unread messages"
              value={data.counts.unread}
              hint={`${data.counts.messages} received`}
              icon={<Inbox className="h-4 w-4" />}
            />
            <StatCard label="Education entries" value={data.counts.education} icon={<Briefcase className="h-4 w-4" />} />
            <StatCard label="Certifications" value={data.counts.certCount} icon={<Award className="h-4 w-4" />} />
            <StatCard label="Achievements" value={data.counts.achievements} icon={<Award className="h-4 w-4" />} />
            <StatCard label="Media assets" value={data.counts.media} icon={<ImageIcon className="h-4 w-4" />} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminSection
              title="Setup checklist"
              description="A few things to make the site complete."
            >
              <ul className="space-y-2.5">
                {data.setupChecklist.map((item) => (
                  <li key={item.key} className="flex items-center gap-2.5 text-sm">
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 opacity-40" aria-hidden="true" />
                    )}
                    <span className={item.done ? '' : 'font-medium'}>{item.label}</span>
                    {item.done ? <span className="sr-only">Done</span> : null}
                  </li>
                ))}
              </ul>
            </AdminSection>

            <AdminSection
              title="Recent activity"
              description="Your latest changes."
              actions={
                <Link to="/admin/analytics" className="text-sm hover:underline">
                  View all
                </Link>
              }
            >
              {data.recentActivity.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  No activity recorded yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.recentActivity.map((entry) => (
                    <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">
                          <span className="font-medium capitalize">{entry.action}</span> {entry.entity}
                          {entry.summary ? <span style={{ color: 'var(--muted)' }}> · {entry.summary}</span> : null}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {entry.user?.name ?? 'System'} · {timeAgo(entry.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSection>
          </div>

          <AdminSection
            title="Latest messages"
            description="Recent contact form submissions."
            actions={
              <Link to="/admin/inbox" className="text-sm hover:underline">
                Open inbox
              </Link>
            }
          >
            {data.recentMessages.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                No messages yet.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {data.recentMessages.map((message) => (
                  <li key={message.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{message.subject || '(no subject)'}</p>
                      <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                        {message.name} · {message.email} · {formatDate(message.createdAt)}
                      </p>
                    </div>
                    <Badge variant={message.status === 'NEW' ? 'primary' : 'muted'}>{message.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>

          {(!data.hasProfile || !data.hasActiveResume) && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-start gap-3">
                <UserCog className="mt-0.5 h-5 w-5 opacity-70" aria-hidden="true" />
                <div>
                  <p className="font-medium">Finish setting up your profile</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {!data.hasProfile ? 'Add your public profile details. ' : ''}
                    {!data.hasActiveResume ? 'Upload a resume so visitors can download it.' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!data.hasProfile ? (
                  <Link to="/admin/profile" className="btn btn-primary btn-sm">
                    Edit profile
                  </Link>
                ) : null}
                {!data.hasActiveResume ? (
                  <Link to="/admin/seo" className="btn btn-outline btn-sm">
                    Manage resume
                  </Link>
                ) : null}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
