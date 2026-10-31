import { useState } from 'react';
import { Download, FileText, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useSeo } from '@/lib/seo';
import { useAsync } from '@/hooks/useAsync';
import { trackAnalytics } from '@/hooks/useAnalytics';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeading } from '@/components/public/PageHeading';
import { useSite } from '@/context/SiteContext';
import type { MediaDTO, ResumeVersion } from '@/types/api';

interface PublicResume {
  active: (Pick<ResumeVersion, 'id' | 'title' | 'versionLabel' | 'downloadFilename' | 'isActive' | 'createdAt'> & {
    media: MediaDTO | null;
  }) | null;
}

export function ResumePage() {
  const { profile } = useSite();
  const [downloading, setDownloading] = useState(false);

  const query = useAsync<PublicResume>(
    () => api.get<PublicResume>('/api/public/resume').then((r) => r.data),
    [],
  );

  useSeo(
    {
      title: 'Resume',
      description: 'Download the latest resume and review experience, education and certifications.',
      image: profile?.profileImage?.url ?? null,
      type: 'profile',
    },
    [profile?.profileImage?.url],
  );

  const resume = query.data?.active ?? null;

  const handleDownload = () => {
    trackAnalytics('RESUME_DOWNLOAD', { label: resume?.title ?? 'resume' });
    setDownloading(true);
    // The download proxy streams the file inline; open it in a new tab.
    window.open('/api/public/resume/download', '_blank', 'noopener');
    window.setTimeout(() => setDownloading(false), 1200);
  };

  return (
    <>
      <div className="relative">
        <div className="aurora-bg" aria-hidden="true" />
        <PageHeading
          eyebrow="Curriculum vitae"
          title="Resume"
          description="The most recent version of my resume, kept up to date here."
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Resume' }]}
        />
      </div>

      <div className="container-page">
        {query.loading ? (
          <LoadingBlock label="Loading resume…" />
        ) : !resume ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="No resume published yet"
            description="A resume has not been made available for download. In the meantime, reach out via the contact page."
            action={
              <Link to="/contact">
                <Button variant="outline" iconLeft={<Mail className="h-4 w-4" aria-hidden="true" />}>
                  Contact me
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)' }}
                  aria-hidden="true"
                >
                  <FileText className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold">{resume.title || 'Resume'}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {resume.versionLabel ? <Badge variant="primary">{resume.versionLabel}</Badge> : null}
                    {resume.createdAt ? (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        Updated {formatDate(resume.createdAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
                    {resume.downloadFilename || resume.media?.originalName || 'resume.pdf'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Button onClick={handleDownload} loading={downloading} iconLeft={<Download className="h-4 w-4" aria-hidden="true" />}>
                  Download resume
                </Button>
              </div>
            </Card>

            <aside className="space-y-6">
              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Prefer a summary?
                </h2>
                <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
                  Browse the experience, education and certification history on the site.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/experience" className="btn btn-outline btn-sm">
                    Experience
                  </Link>
                  <Link to="/achievements" className="btn btn-outline btn-sm">
                    Achievements
                  </Link>
                </div>
              </Card>

              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Questions?
                </h2>
                <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
                  For roles, collaborations or references, get in touch.
                </p>
                <Link to="/contact" className="btn btn-primary btn-sm mt-4">
                  <Mail className="h-4 w-4" aria-hidden="true" /> Contact
                </Link>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
