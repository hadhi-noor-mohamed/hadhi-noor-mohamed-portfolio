import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { PageHeading } from '@/components/public/PageHeading';
import { ContactForm } from '@/components/public/ContactForm';

export function ContactPage() {
  const { profile, sectionByKey } = useSite();

  useSeo(
    {
      title: 'Contact',
      description: 'Get in touch about opportunities, collaboration or technical questions.',
      image: profile?.profileImage?.url ?? null,
    },
    [profile?.profileImage?.url],
  );

  return (
    <>
      <PageHeading
        eyebrow="Say hello"
        title="Get in touch"
        description="Recruiters, collaborators and fellow learners are all welcome. Your details are only used to reply to you."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
      />
      <ContactForm section={sectionByKey('contact')} />
    </>
  );
}
