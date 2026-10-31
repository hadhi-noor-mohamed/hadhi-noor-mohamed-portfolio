import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { PageHeading } from '@/components/public/PageHeading';
import { BlogGrid } from '@/components/public/BlogGrid';

export function BlogPage() {
  const { profile, sectionByKey } = useSite();

  useSeo(
    {
      title: 'Blog',
      description: 'Technical explanations, notes and reflections on the things I build and learn.',
      image: profile?.profileImage?.url ?? null,
    },
    [profile?.profileImage?.url],
  );

  return (
    <>
      <PageHeading
        eyebrow="Writing"
        title="Technical writing"
        description="Explainers and notes from my projects. Draft posts stay private until published."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Blog' }]}
      />
      <BlogGrid section={sectionByKey('blog')} />
    </>
  );
}
