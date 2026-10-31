import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { DynamicIcon } from '@/components/ui/Icon';
import { api, errorMessage } from '@/lib/api';
import { trackAnalytics } from '@/hooks/useAnalytics';
import { useToast } from '@/context/ToastContext';
import { useSite } from '@/context/SiteContext';
import type { ContactCategory, PageSection } from '@/types/api';

const CATEGORY_OPTIONS: Array<{ value: ContactCategory; label: string }> = [
  { value: 'JOB_OPPORTUNITY', label: 'Job opportunity' },
  { value: 'PROJECT_COLLABORATION', label: 'Project collaboration' },
  { value: 'TECHNICAL_DISCUSSION', label: 'Technical discussion' },
  { value: 'FEEDBACK', label: 'Feedback' },
  { value: 'OTHER', label: 'Other' },
];

const schema = z.object({
  name: z.string().min(1, 'Please enter your name').max(160),
  email: z.string().min(1, 'Please enter your email').email('Enter a valid email address').max(320),
  subject: z.string().max(200).optional(),
  category: z.enum(['JOB_OPPORTUNITY', 'PROJECT_COLLABORATION', 'TECHNICAL_DISCUSSION', 'FEEDBACK', 'OTHER']),
  message: z.string().min(1, 'Please write a message').max(5000),
  consent: z.boolean().refine((value) => value === true, { message: 'Please agree before sending' }),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm({ section }: { section?: PageSection }) {
  const { profile, socialLinks } = useSite();
  const toast = useToast();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', subject: '', category: 'JOB_OPPORTUNITY', message: '', consent: false },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post('/api/public/contact', {
        name: values.name,
        email: values.email,
        subject: values.subject ?? '',
        category: values.category,
        message: values.message,
        consent: values.consent,
      });
      trackAnalytics('CONTACT_SUBMIT', { label: values.category });
      setSent(true);
      reset();
      toast.success('Thanks — your message has been sent.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <SectionShell section={section} id="contact">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <Card elevated>
          {sent ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">Message sent</h3>
              <p className="mt-2 max-w-sm text-sm" style={{ color: 'var(--muted)' }}>
                Thank you for reaching out. Your message has been received and will be read soon.
              </p>
              <Button variant="outline" className="mt-5" onClick={() => setSent(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" htmlFor="contact-name" error={errors.name?.message} required>
                  <Input id="contact-name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register('name')} />
                </Field>
                <Field label="Email address" htmlFor="contact-email" error={errors.email?.message} required>
                  <Input id="contact-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register('email')} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="contact-category" error={errors.category?.message} required>
                  <Select
                    id="contact-category"
                    placeholder="Choose a category"
                    options={CATEGORY_OPTIONS}
                    aria-invalid={Boolean(errors.category)}
                    {...register('category')}
                  />
                </Field>
                <Field label="Subject" htmlFor="contact-subject" error={errors.subject?.message} hint="Optional">
                  <Input id="contact-subject" aria-invalid={Boolean(errors.subject)} {...register('subject')} />
                </Field>
              </div>

              <Field label="Message" htmlFor="contact-message" error={errors.message?.message} required>
                <Textarea
                  id="contact-message"
                  rows={6}
                  placeholder="Tell me a little about what you'd like to discuss…"
                  aria-invalid={Boolean(errors.message)}
                  {...register('message')}
                />
              </Field>

              <div>
                <label className="flex items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border"
                    style={{ borderColor: 'var(--border)' }}
                    aria-invalid={Boolean(errors.consent)}
                    {...register('consent')}
                  />
                  <span style={{ color: 'var(--muted)' }}>
                    I agree that the details I submit may be stored so the owner can reply to me.
                  </span>
                </label>
                {errors.consent ? <p className="error-text mt-1">{errors.consent.message}</p> : null}
              </div>

              <Button type="submit" size="lg" loading={isSubmitting} iconRight={<Send className="h-4 w-4" aria-hidden="true" />}>
                Send message
              </Button>
            </form>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold">Other ways to reach me</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {profile?.email ? (
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
              {profile?.phone ? (
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Phone</dt>
                    <dd>{profile.phone}</dd>
                  </div>
                </div>
              ) : null}
              {profile?.location ? (
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Location</dt>
                    <dd>{profile.location}</dd>
                  </div>
                </div>
              ) : null}
            </dl>

            {socialLinks.length ? (
              <ul className="mt-5 flex flex-wrap gap-2">
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

          <Card flat>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Your message is stored securely so the owner can reply. It is not shared with third parties and the form is
              rate limited to reduce spam.
            </p>
          </Card>
        </div>
      </div>
    </SectionShell>
  );
}
