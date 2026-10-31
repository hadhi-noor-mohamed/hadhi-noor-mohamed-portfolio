import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Sparkles } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionShell } from '@/components/public/SectionShell';
import { HeroSection } from '@/components/public/HeroSection';
import { AboutSection } from '@/components/public/AboutSection';
import { SkillsExplorer } from '@/components/public/SkillsExplorer';
import { ProjectsGrid } from '@/components/public/ProjectsGrid';
import { TimelineView } from '@/components/public/TimelineView';
import { AchievementsList, CertificationsList } from '@/components/public/ShowcaseView';
import { JourneyFeed } from '@/components/public/JourneyFeed';
import { BlogGrid } from '@/components/public/BlogGrid';
import { ContactForm } from '@/components/public/ContactForm';
import { StructuredData } from '@/components/public/StructuredData';
import type { Achievement, Certification, PageSection } from '@/types/api';

/** Fallback ordering used if the section configuration has not been seeded yet. */
const FALLBACK_SECTIONS: PageSection[] = (
  [
    ['hero', 'Hero'],
    ['about', 'About me'],
    ['skills', 'Skills & tools'],
    ['projects', 'Selected projects'],
    ['experience', 'Experience'],
    ['education', 'Education'],
    ['achievements', 'Achievements'],
    ['certifications', 'Certifications'],
    ['journey', 'Learning journey'],
    ['blog', 'Technical writing'],
    ['contact', 'Get in touch'],
    ['resume', 'Resume'],
  ] as const
).map(([key, label], index) => ({
  id: key,
  key,
  label,
  title: label,
  subtitle: '',
  description: '',
  layout: 'default',
  variant: 'default',
  cardStyle: 'elevated',
  background: key === 'hero' || key === 'contact' ? 'aurora' : 'default',
  accent: 'primary',
  spacing: 'normal',
  animation: 'subtle',
  enabled: true,
  sortOrder: index,
}));

function ResumeCta({ section }: { section?: PageSection }) {
  return (
    <SectionShell section={section} id="resume">
      <Card elevated className="flex flex-col items-start justify-between gap-5 p-8 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">{section?.title || 'Resume'}</h2>
          <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
            {section?.subtitle || 'Prefer a document? Download the latest version of my resume.'}
          </p>
        </div>
        <Link to="/resume">
          <Button size="lg" iconLeft={<FileText className="h-4 w-4" aria-hidden="true" />}>
            View resume
          </Button>
        </Link>
      </Card>
    </SectionShell>
  );
}

export function HomePage() {
  const { profile, sections, loading } = useSite();
  const achievements = useAsync<Achievement[]>(() => api.get<Achievement[]>('/api/public/achievements').then((r) => r.data), []);
  const certifications = useAsync<Certification[]>(
    () => api.get<Certification[]>('/api/public/certifications').then((r) => r.data),
    [],
  );

  const ordered = useMemo<PageSection[]>(() => {
    const source = sections.length ? sections : FALLBACK_SECTIONS;
    return source.filter((section) => section.enabled).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sections]);

  useSeo(
    {
      title: profile?.seoTitle || profile?.fullName || undefined,
      exact: Boolean(profile?.seoTitle),
      description: profile?.seoDescription || profile?.headline || undefined,
      image: profile?.profileImage?.url ?? profile?.heroImage?.url ?? null,
      type: 'profile',
      url: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
    [profile?.seoTitle, profile?.seoDescription, profile?.fullName],
  );

  const renderSection = (section: PageSection) => {
    switch (section.key) {
      case 'hero':
        return <HeroSection key={section.key} section={section} />;
      case 'about':
        return <AboutSection key={section.key} section={section} />;
      case 'skills':
        return <SkillsExplorer key={section.key} section={section} limit={6} showFilters={false} showSearch={false} />;
      case 'projects':
        return <ProjectsGrid key={section.key} section={section} limit={6} showFilters={false} showPagination={false} />;
      case 'experience':
        return (
          <TimelineView
            key={section.key}
            section={section}
            id="experience"
            types={['WORK', 'INTERNSHIP', 'TRAINING', 'WORKSHOP', 'VOLUNTEER']}
          />
        );
      case 'education':
        return <TimelineView key={section.key} section={section} id="education" types={['EDUCATION']} />;
      case 'achievements':
        return <AchievementsList key={section.key} section={section} achievements={achievements.data ?? []} />;
      case 'certifications':
        return <CertificationsList key={section.key} section={section} certifications={certifications.data ?? []} />;
      case 'journey':
        return <JourneyFeed key={section.key} section={section} limit={3} showFilters={false} showPagination={false} />;
      case 'blog':
        return <BlogGrid key={section.key} section={section} limit={3} showFilters={false} showPagination={false} showFeatured={false} />;
      case 'contact':
        return <ContactForm key={section.key} section={section} />;
      case 'resume':
        return <ResumeCta key={section.key} section={section} />;
      default:
        return null;
    }
  };

  const structuredData = profile
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: profile.fullName,
        jobTitle: profile.headline,
        description: profile.seoDescription || profile.intro,
        email: profile.email || undefined,
        address: profile.location ? { '@type': 'PostalAddress', addressLocality: profile.location } : undefined,
        knowsAbout: profile.techBadges.length ? profile.techBadges : undefined,
      }
    : null;

  return (
    <>
      {structuredData ? <StructuredData data={structuredData} /> : null}

      {ordered.map(renderSection)}

      {!loading && !profile ? (
        <section className="container-page py-20">
          <Card elevated className="mx-auto max-w-xl p-8 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-[var(--brand-primary)]" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-semibold">The site is not configured yet</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Sign in to the dashboard to add your profile, projects and skills. Public content is loaded from the database.
            </p>
            <div className="mt-5 flex justify-center">
              <Link to="/admin">
                <Button>Open dashboard</Button>
              </Link>
            </div>
          </Card>
        </section>
      ) : null}
    </>
  );
}
