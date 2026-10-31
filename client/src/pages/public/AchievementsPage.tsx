import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { PageHeading } from '@/components/public/PageHeading';
import { ShowcaseView } from '@/components/public/ShowcaseView';

export function AchievementsPage() {
  const { profile, sectionByKey } = useSite();

  useSeo(
    {
      title: 'Achievements & certifications',
      description: 'Competitions, awards, recognition and the certifications I have earned.',
      image: profile?.profileImage?.url ?? null,
    },
    [profile?.profileImage?.url],
  );

  return (
    <>
      <PageHeading
        eyebrow="Recognition"
        title="Achievements & certifications"
        description="Verified credentials and milestones. Only what I can substantiate is listed here."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Achievements' }]}
      />
      <ShowcaseView
        achievementsSection={sectionByKey('achievements')}
        certificationsSection={sectionByKey('certifications')}
      />
    </>
  );
}
