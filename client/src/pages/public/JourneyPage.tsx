import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { PageHeading } from '@/components/public/PageHeading';
import { JourneyFeed } from '@/components/public/JourneyFeed';

export function JourneyPage() {
  const { profile, sectionByKey } = useSite();

  useSeo(
    {
      title: 'Learning journey',
      description: 'Notes and updates on what I am learning, building and attending.',
      image: profile?.profileImage?.url ?? null,
    },
    [profile?.profileImage?.url],
  );

  return (
    <>
      <PageHeading
        eyebrow="In progress"
        title="Learning journey"
        description="Short, honest updates about what I am studying and building right now."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Learning journey' }]}
      />
      <JourneyFeed section={sectionByKey('journey')} />
    </>
  );
}
