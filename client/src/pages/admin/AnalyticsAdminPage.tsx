import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderKanban,
  Inbox,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminPageHeader, AdminSection, StatCard } from '@/components/admin/AdminUI';
import type { Analytics } from '@/types/api';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

const SERIES = [
  { key: 'pageViews', label: 'Page views', color: '#7c3aed' },
  { key: 'projectViews', label: 'Project views', color: '#06b6d4' },
  { key: 'blogViews', label: 'Blog views', color: '#ec4899' },
  { key: 'downloads', label: 'Resume downloads', color: '#22c55e' },
  { key: 'messages', label: 'Messages', color: '#f59e0b' },
] as const;

export function AdminAnalyticsPage() {
  const [days, setDays] = useState('30');

  const query = useAsync<Analytics>(() => api.get<Analytics>('/api/admin/analytics', { days }).then((r) => r.data), [days]);
  const audit = useAsync<AuditEntry[]>(() => api.get<AuditEntry[]>('/api/admin/audit-log', { limit: 40 }).then((r) => r.data), []);

  const data = query.data;
  const hasData = Boolean(data && data.totals.events > 0);

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        description="Honest, first-party counts from this site's own records."
        actions={<Select aria-label="Date range" value={days} onChange={(e) => setDays(e.target.value)} options={RANGE_OPTIONS} className="w-44" />}
      />

      {query.loading ? (
        <LoadingBlock label="Loading analytics…" />
      ) : query.error || !data ? (
        <EmptyState icon={<LineChartIcon className="h-5 w-5" />} title="Analytics unavailable" description="Please retry shortly." />
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <p className="flex items-start gap-2">
              <Activity className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              <span>{data.measurementNote}</span>
            </p>
          </div>

          {!data.collected ? (
            <EmptyState
              title="Event collection is disabled"
              description="Analytics collection is turned off in site settings, so no new events are being recorded."
            />
          ) : !hasData ? (
            <EmptyState
              icon={<Eye className="h-5 w-5" />}
              title="No events in this period"
              description="Nothing has been recorded in the selected range yet. Figures appear once visitors browse the public site."
            />
          ) : null}

          <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Page views" value={data.totals.pageViews} icon={<Eye className="h-4 w-4" />} />
            <StatCard label="Project views" value={data.totals.projectViews} icon={<FolderKanban className="h-4 w-4" />} />
            <StatCard label="Blog views" value={data.totals.blogViews} icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Resume downloads" value={data.totals.resumeDownloads} icon={<Download className="h-4 w-4" />} />
            <StatCard label="External link clicks" value={data.totals.externalLinkClicks} icon={<ExternalLink className="h-4 w-4" />} />
            <StatCard label="Project link clicks" value={data.totals.projectLinkClicks} icon={<ExternalLink className="h-4 w-4" />} />
            <StatCard label="Contact messages" value={data.totals.contactMessages} hint={`${data.totals.contactMessagesAllTime} all time`} icon={<Inbox className="h-4 w-4" />} />
            <StatCard label="Total events" value={data.totals.events} icon={<Activity className="h-4 w-4" />} />
          </section>

          <AdminSection title="Activity over time" description={`Daily counts for the ${days}-day window.`}>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    {SERIES.map((s) => (
                      <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.color} stopOpacity={0.5} />
                        <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(value: string) => value.slice(5)} minTickGap={24} stroke="rgba(148,163,184,0.6)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="rgba(148,163,184,0.6)" />
                  <Tooltip
                    labelFormatter={(value: string) => formatDate(value)}
                    contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 12, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {SERIES.map((s) => (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      fill={`url(#grad-${s.key})`}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AdminSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminSection title="Top projects" description="By recorded project views.">
              {data.topProjects.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  No project views recorded yet.
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {data.topProjects.map((project) => (
                    <li key={project.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <Link to={`/admin/projects/${project.id}`} className="truncate font-medium hover:underline">
                        {project.title}
                      </Link>
                      <span className="shrink-0 text-xs" style={{ color: 'var(--muted)' }}>
                        {project.views} view{project.views === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSection>

            <AdminSection title="Top posts" description="By recorded blog views.">
              {data.topPosts.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  No blog views recorded yet.
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {data.topPosts.map((post) => (
                    <li key={post.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <Link to={`/admin/blog/${post.id}`} className="truncate font-medium hover:underline">
                        {post.title}
                      </Link>
                      <span className="shrink-0 text-xs" style={{ color: 'var(--muted)' }}>
                        {post.views} view{post.views === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSection>
          </div>

          <AdminSection title="Events by type" description="Every recorded event type in this window.">
            {Object.keys(data.byType).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                No event types recorded.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <span key={type} className="badge" style={{ borderColor: 'var(--border)' }}>
                      {type.toLowerCase().replace(/_/g, ' ')} · <strong className="ml-1">{count}</strong>
                    </span>
                  ))}
              </div>
            )}
          </AdminSection>

          <AdminSection
            title="Activity log"
            description={
              data.firstEventAt
                ? `First event ${formatDate(data.firstEventAt)} · last event ${data.lastEventAt ? timeAgo(data.lastEventAt) : '—'}`
                : 'Administrative actions recorded on this site.'
            }
          >
            {audit.loading ? (
              <LoadingBlock label="Loading activity…" />
            ) : (audit.data ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                No administrative activity recorded yet.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {(audit.data ?? []).map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">
                        <span className="font-medium capitalize">{entry.action}</span> {entry.entity}
                        {entry.summary ? <span style={{ color: 'var(--muted)' }}> · {entry.summary}</span> : null}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {entry.user?.name ?? 'System'} · {timeAgo(entry.createdAt)}
                      </p>
                    </div>
                    <Badge variant="muted">{entry.entity}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>

          <Card className="p-4 text-xs" style={{ color: 'var(--muted)' }}>
            Unique visitors are deliberately not shown: this site does not fingerprint or cross-site track visitors.
          </Card>
        </div>
      )}
    </div>
  );
}
