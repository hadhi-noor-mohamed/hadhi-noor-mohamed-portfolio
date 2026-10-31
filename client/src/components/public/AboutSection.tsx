import { Link } from 'react-router-dom';
import { BadgeCheck, Download, Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DynamicIcon } from '@/components/ui/Icon';
import { Avatar } from './MediaImage';
import { useSite } from '@/context/SiteContext';
import type { PageSection } from '@/types/api';

/**
 * About section — renders the owner-authored rich text plus a "quick facts"
 * aside. The HTML is sanitised on the server before it is stored, so it is
 * safe to inject here.
 */
export function AboutSection({ section }: { section?: PageSection }) {
  const { profile, socialLinks } = useSite();
  if (!profile) return null;

  const openTo = [
    profile.openToInternship && 'Internships',
    profile.openToFreelance && 'Freelance work',
    profile.openToRelocation && 'Relocation',
    profile.seekingEmployment && 'Full-time roles',
  ].filter(Boolean) as string[];

  return (
    <SectionShell section={section} id="about">
      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div>
          {profile.aboutHtml ? (
            <div className="rich-text max-w-3xl text-base" dangerouslySetInnerHTML={{ __html: profile.aboutHtml }} />
          ) : (
            <p className="text-base" style={{ color: 'var(--muted)' }}>
              {profile.intro}
            </p>
          )}

          {profile.techBadges.length ? (
            <div className="mt-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Tools & technologies
              </p>
              <ul className="flex flex-wrap gap-2">
                {profile.techBadges.map((tech) => (
                  <li key={tech}>
                    <Badge>{tech}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/projects">
              <Button>See my projects</Button>
            </Link>
            <Link to="/resume">
              <Button variant="outline" iconLeft={<Download className="h-4 w-4" aria-hidden="true" />}>
                View resume
              </Button>
            </Link>
          </div>
        </div>

        <Card elevated className="h-fit">
          <div className="flex items-center gap-4">
            {profile.profileImage ? (
              <Avatar media={profile.profileImage} name={profile.fullName} className="h-16 w-16 shrink-0 rounded-xl" />
            ) : (
              <span
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-xl font-bold"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 16%, transparent)' }}
                aria-hidden="true"
              >
                {profile.fullName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join('')}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile.fullName}</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {profile.headline}
              </p>
            </div>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            {profile.location ? (
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Location</dt>
                  <dd>{profile.location}</dd>
                </div>
              </div>
            ) : null}
            {profile.email ? (
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Email</dt>
                  <dd>
                    <a href={`mailto:${profile.email}`} className="hover:underline">
                      {profile.email}
                    </a>
                  </dd>
                </div>
              </div>
            ) : null}
            {profile.phone ? (
              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Phone</dt>
                  <dd>{profile.phone}</dd>
                </div>
              </div>
            ) : null}
            {profile.availabilityEnabled && profile.availabilityLabel ? (
              <div className="flex items-start gap-2.5">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Availability</dt>
                  <dd>{profile.availabilityLabel}</dd>
                </div>
              </div>
            ) : null}
          </dl>

          {openTo.length ? (
            <p className="mt-6 inline-flex items-center gap-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden="true" />
              Open to: <span className="font-medium">{openTo.join(' · ')}</span>
            </p>
          ) : null}

          {socialLinks.length ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target={link.url.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    <DynamicIcon name={link.icon} className="h-4 w-4" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>
    </SectionShell>
  );
}
