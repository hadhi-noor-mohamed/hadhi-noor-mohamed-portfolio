import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Download, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DynamicIcon } from '@/components/ui/Icon';
import { Avatar } from '@/components/public/MediaImage';
import { useSite } from '@/context/SiteContext';
import type { PageSection } from '@/types/api';

export function HeroSection({ section }: { section?: PageSection }) {
  const { profile, socialLinks, settings } = useSite();
  if (!profile) return null;

  const openTo = [
    profile.openToInternship && 'Internships',
    profile.openToFreelance && 'Freelance',
    profile.openToRelocation && 'Relocation',
  ].filter(Boolean) as string[];

  return (
    <section id="hero" className="relative overflow-hidden scroll-mt-20 py-16 sm:py-24">
      <div className="container-page relative grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          {profile.availabilityEnabled && profile.availabilityLabel ? (
            <Badge variant="success" icon={<BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />}>
              {profile.availabilityLabel}
            </Badge>
          ) : null}

          <h1 className="mt-4 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            {section?.title ? <span className="block text-base font-medium" style={{ color: 'var(--muted)' }}>{section.title}</span> : null}
            <span className="gradient-text">{profile.fullName}</span>
          </h1>

          <p className="mt-4 max-w-2xl text-lg" style={{ color: 'var(--muted)' }}>
            {profile.headline}
          </p>
          <p className="mt-3 max-w-2xl text-base">{profile.intro}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/projects">
              <Button size="lg" iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
                View projects
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg" iconLeft={<Mail className="h-4 w-4" aria-hidden="true" />}>
                Contact me
              </Button>
            </Link>
            <Link to="/resume">
              <Button variant="ghost" size="lg" iconLeft={<Download className="h-4 w-4" aria-hidden="true" />}>
                Resume
              </Button>
            </Link>
          </div>

          {profile.location ? (
            <p className="mt-6 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--muted)' }}>
              <MapPin className="h-4 w-4" aria-hidden="true" /> {profile.location}
            </p>
          ) : null}

          {profile.techBadges.length ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {profile.techBadges.map((tech) => (
                <li key={tech}>
                  <Badge>{tech}</Badge>
                </li>
              ))}
            </ul>
          ) : null}

          {openTo.length ? (
            <p className="mt-6 text-sm" style={{ color: 'var(--muted)' }}>
              Open to: <span className="font-medium" style={{ color: 'var(--text)' }}>{openTo.join(' · ')}</span>
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="gradient-border card overflow-hidden p-2">
            {profile.profileImage ? (
              <Avatar media={profile.profileImage} name={profile.fullName} className="aspect-square w-full rounded-[calc(var(--radius)-4px)] object-cover" />
            ) : (
              <div
                className="flex aspect-square w-full items-center justify-center rounded-[calc(var(--radius)-4px)] text-6xl font-bold"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)' }}
                aria-hidden="true"
              >
                {profile.fullName.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs" style={{ color: 'var(--muted)' }}>
            {settings?.siteTitle}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
