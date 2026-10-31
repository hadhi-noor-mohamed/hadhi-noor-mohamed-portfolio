import { Award, ExternalLink, FileText, ShieldCheck, Trophy } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaImage } from './MediaImage';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/utils';
import type { Achievement, Certification, PageSection } from '@/types/api';

export function CertificationCard({ certification }: { certification: Certification }) {
  return (
    <Card as="article" interactive className="flex h-full flex-col overflow-hidden p-0">
      {certification.image ? (
        <MediaImage
          media={certification.image}
          alt={certification.title}
          className="aspect-[16/9] w-full overflow-hidden"
          imgClassName="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex aspect-[16/9] w-full items-center justify-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}
          aria-hidden="true"
        >
          <ShieldCheck className="h-8 w-8 opacity-50" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {certification.issuer ? <Badge variant="primary">{certification.issuer}</Badge> : null}
          {certification.featured ? <Badge>Featured</Badge> : null}
        </div>
        <h3 className="font-semibold">{certification.title}</h3>
        {certification.issueDate ? (
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Issued {formatDate(certification.issueDate)}
          </p>
        ) : null}
        {certification.description ? (
          <p className="mt-2 flex-1 text-sm" style={{ color: 'var(--muted)' }}>
            {certification.description}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        {certification.skillTags.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {certification.skillTags.map((tag) => (
              <li key={tag}>
                <span className="badge">{tag}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {certification.credentialUrl ? (
            <a href={certification.credentialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Verify credential
            </a>
          ) : null}
          {certification.pdf ? (
            <a href={certification.pdf.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Certificate
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <Card as="article" interactive className="flex h-full gap-4 p-5">
      {achievement.image ? (
        <MediaImage
          media={achievement.image}
          alt={achievement.title}
          className="h-20 w-20 shrink-0 overflow-hidden rounded-lg"
          imgClassName="h-full w-full object-cover"
        />
      ) : (
        <span
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-pink) 14%, transparent)' }}
          aria-hidden="true"
        >
          <Trophy className="h-7 w-7" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{achievement.title}</h3>
        {achievement.organization ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {achievement.organization}
          </p>
        ) : null}
        {achievement.date ? (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            {formatDate(achievement.date)}
          </p>
        ) : null}
        {achievement.description ? (
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            {achievement.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {achievement.verificationUrl ? (
            <a href={achievement.verificationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Verify
            </a>
          ) : null}
          {achievement.pdf ? (
            <a href={achievement.pdf.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Document
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function AchievementsList({ achievements, section }: { achievements: Achievement[]; section?: PageSection }) {
  if (!achievements.length) {
    return (
      <SectionShell section={section} id="achievements">
        <EmptyState
          icon={<Trophy className="h-5 w-5" />}
          title="No achievements yet"
          description="Competitions, awards and recognition will appear here once added."
        />
      </SectionShell>
    );
  }
  return (
    <SectionShell section={section} id="achievements">
      <ul className="grid gap-4 md:grid-cols-2">
        {achievements.map((achievement) => (
          <li key={achievement.id}>
            <AchievementCard achievement={achievement} />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function CertificationsList({ certifications, section }: { certifications: Certification[]; section?: PageSection }) {
  if (!certifications.length) {
    return (
      <SectionShell section={section} id="certifications">
        <EmptyState
          icon={<Award className="h-5 w-5" />}
          title="No certifications yet"
          description="Courses and credentials will appear here once added."
        />
      </SectionShell>
    );
  }
  return (
    <SectionShell section={section} id="certifications">
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {certifications.map((certification) => (
          <li key={certification.id}>
            <CertificationCard certification={certification} />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/** Combined achievements + certifications view used on the achievements page. */
export function ShowcaseView({ achievementsSection, certificationsSection }: { achievementsSection?: PageSection; certificationsSection?: PageSection }) {
  const achievements = useAsync<Achievement[]>(() => api.get<Achievement[]>('/api/public/achievements').then((r) => r.data), []);
  const certifications = useAsync<Certification[]>(() => api.get<Certification[]>('/api/public/certifications').then((r) => r.data), []);
  const loading = achievements.loading || certifications.loading;
  const error = achievements.error || certifications.error;

  if (loading) return <LoadingBlock label="Loading achievements…" />;
  if (error) {
    return (
      <EmptyState
        icon={<Trophy className="h-5 w-5" />}
        title="Achievements unavailable"
        description="Please try again shortly."
      />
    );
  }

  return (
    <>
      <AchievementsList achievements={achievements.data ?? []} section={achievementsSection} />
      <CertificationsList certifications={certifications.data ?? []} section={certificationsSection} />
    </>
  );
}
