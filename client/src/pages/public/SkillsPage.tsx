import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { PageHeading } from '@/components/public/PageHeading';
import { SkillsExplorer } from '@/components/public/SkillsExplorer';

export function SkillsPage() {
  const { profile, sectionByKey } = useSite();

  useSeo(
    {
      title: 'Skills & tools',
      description: sectionByKey('skills')?.subtitle || 'A filterable overview of the tools, languages and frameworks I work with.',
      image: profile?.profileImage?.url ?? null,
    },
    [profile?.profileImage?.url],
  );

  return (
    <>
      <PageHeading
        eyebrow="Capabilities"
        title="Skills & tools"
        description="Browse by category or search. Proficiency labels describe my own confidence — no ratings are invented."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Skills' }]}
      />
      <SkillsExplorer section={sectionByKey('skills')} />
    </>
  );
}
