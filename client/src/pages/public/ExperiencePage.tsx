import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { PageHeading } from '@/components/public/PageHeading';
import { TimelineView } from '@/components/public/TimelineView';

export function ExperiencePage() {
  const { profile, sectionByKey } = useSite();

  useSeo(
    {
      title: 'Experience',
      description: 'Internships, training, workshops and work history, plus my academic background.',
      image: profile?.profileImage?.url ?? null,
    },
    [profile?.profileImage?.url],
  );

  return (
    <>
      <PageHeading
        eyebrow="Background"
        title="Experience & education"
        description="A chronological view of the internships, training and education that shaped how I build software."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Experience' }]}
      />
      <TimelineView
        section={sectionByKey('experience') ?? { ...fallback('experience', 'Experience'), subtitle: 'Internships, training and work' }}
        id="experience"
        types={['WORK', 'INTERNSHIP', 'TRAINING', 'WORKSHOP', 'VOLUNTEER']}
      />
      <TimelineView
        section={{ ...(sectionByKey('education') ?? fallback('education', 'Education')), subtitle: 'Academic background' }}
        id="education"
        types={['EDUCATION']}
      />
    </>
  );
}

function fallback(key: string, title: string) {
  return {
    id: key,
    key,
    label: title,
    title,
    subtitle: '',
    description: '',
    layout: 'timeline',
    variant: 'default',
    cardStyle: 'elevated',
    background: 'default',
    accent: 'primary',
    spacing: 'normal',
    animation: 'subtle',
    enabled: true,
    sortOrder: 0,
  };
}
