import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { PageHeading } from '@/components/public/PageHeading';
import { AboutSection } from '@/components/public/AboutSection';
import { TimelineView } from '@/components/public/TimelineView';

export function AboutPage() {
  const { profile, sectionByKey, isSectionEnabled } = useSite();

  useSeo(
    {
      title: `About ${profile?.fullName ?? ''}`.trim(),
      description: profile?.seoDescription || profile?.intro || undefined,
      image: profile?.profileImage?.url ?? null,
      type: 'profile',
    },
    [profile?.fullName, profile?.seoDescription],
  );

  return (
    <>
      <PageHeading
        eyebrow="About"
        title={`Hi, I'm ${profile?.fullName ?? 'Hadhi Noor Mohamed H'}`}
        description={profile?.headline}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
      />
      <AboutSection section={sectionByKey('about')} />

      {isSectionEnabled('education') ? (
        <TimelineView
          section={{ ...(sectionByKey('education') ?? fallbackEducationSection()), key: 'education', title: 'Education', subtitle: 'Academic background' }}
          id="education"
          types={['EDUCATION']}
        />
      ) : null}
    </>
  );
}

function fallbackEducationSection() {
  return {
    id: 'education',
    key: 'education',
    label: 'Education',
    title: 'Education',
    subtitle: 'Academic background',
    description: '',
    layout: 'timeline',
    variant: 'cards',
    cardStyle: 'elevated',
    background: 'default',
    accent: 'accent',
    spacing: 'normal',
    animation: 'subtle',
    enabled: true,
    sortOrder: 0,
  };
}
