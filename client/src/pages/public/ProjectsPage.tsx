import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { PageHeading } from '@/components/public/PageHeading';
import { ProjectsGrid } from '@/components/public/ProjectsGrid';

export function ProjectsPage() {
  const { profile, sectionByKey } = useSite();

  useSeo(
    {
      title: 'Projects',
      description: sectionByKey('projects')?.subtitle || 'Things I have designed, built and shipped — with the problems they solve.',
      image: profile?.profileImage?.url ?? null,
    },
    [profile?.profileImage?.url],
  );

  return (
    <>
      <PageHeading
        eyebrow="Portfolio"
        title="Projects"
        description="Filter by category, technology or status. Each project documents the problem, approach and outcome."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Projects' }]}
      />
      <ProjectsGrid section={sectionByKey('projects')} />
    </>
  );
}
