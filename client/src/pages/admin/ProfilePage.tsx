import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { GripVertical, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { useMediaLookup } from '@/hooks/useMediaLookup';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { TagInput } from '@/components/ui/TagInput';
import { RichTextEditor } from '@/components/ui/RichText';
import { MediaField } from '@/components/admin/MediaField';
import { AdminPageHeader, AdminSection } from '@/components/admin/AdminUI';
import { ICON_NAMES } from '@/components/ui/Icon';
import type { NavigationItem, Profile, SocialLink } from '@/types/api';

const EMPTY_PROFILE: Profile = {
  id: '',
  fullName: '',
  headline: '',
  intro: '',
  aboutHtml: '',
  location: '',
  email: '',
  phone: '',
  wordmark: '',
  availabilityLabel: '',
  availabilityEnabled: false,
  seekingEmployment: false,
  openToFreelance: false,
  openToRelocation: false,
  openToInternship: false,
  techBadges: [],
  seoTitle: '',
  seoDescription: '',
  profileImageId: null,
  heroImageId: null,
};

export function AdminProfilePage() {
  const [tab, setTab] = useState('profile');

  return (
    <div>
      <AdminPageHeader title="Profile" description="Your public identity, links and navigation." />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'profile', label: 'Overview & about' },
          { id: 'social', label: 'Social links' },
          { id: 'nav', label: 'Navigation' },
        ]}
      />
      {tab === 'profile' ? <ProfileForm /> : null}
      {tab === 'social' ? <SocialLinks /> : null}
      {tab === 'nav' ? <NavigationEditor /> : null}
    </div>
  );
}

function ProfileForm() {
  const toast = useToast();
  const media = useMediaLookup();
  const query = useAsync<Profile | null>(
    () => api.get<{ profile: Profile | null }>('/api/admin/profile').then((r) => r.data.profile),
    [],
  );
  const [form, setForm] = useState<Profile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data) setForm({ ...EMPTY_PROFILE, ...query.data });
  }, [query.data]);

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/admin/profile', form);
      toast.success('Profile saved');
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (query.loading) return <LoadingBlock label="Loading profile…" />;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AdminSection title="Identity" description="Core details shown across the site.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="p-name" required>
            <Input id="p-name" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required />
          </Field>
          <Field label="Wordmark" htmlFor="p-wordmark" hint="Short brand text for the header (optional).">
            <Input id="p-wordmark" value={form.wordmark} onChange={(e) => update('wordmark', e.target.value)} />
          </Field>
          <Field label="Headline" htmlFor="p-headline" required className="sm:col-span-2">
            <Input id="p-headline" value={form.headline} onChange={(e) => update('headline', e.target.value)} required />
          </Field>
          <Field label="Intro" htmlFor="p-intro" hint="A short one-or-two sentence summary." required className="sm:col-span-2">
            <Textarea id="p-intro" rows={3} value={form.intro} onChange={(e) => update('intro', e.target.value)} required />
          </Field>
          <Field label="Location" htmlFor="p-location">
            <Input id="p-location" value={form.location} onChange={(e) => update('location', e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="p-email">
            <Input id="p-email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="p-phone" hint="Only shown where you reference it; never auto-published.">
            <Input id="p-phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </Field>
          <Field label="Tech badges" htmlFor="p-badges" hint="Short labels shown near your name.">
            <TagInput id="p-badges" value={form.techBadges} onChange={(v) => update('techBadges', v)} placeholder="React, Node, …" />
          </Field>
        </div>
      </AdminSection>

      <AdminSection title="About" description="The long-form about section. Formatting is sanitised on save.">
        <RichTextEditor value={form.aboutHtml} onChange={(v) => update('aboutHtml', v)} label="About content" />
      </AdminSection>

      <AdminSection title="Availability" description="Honest availability signals — only enable what is true.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Switch checked={form.availabilityEnabled} onChange={(v) => update('availabilityEnabled', v)} label="Show availability badge" />
          <Field label="Availability label" htmlFor="p-avail">
            <Input
              id="p-avail"
              value={form.availabilityLabel}
              onChange={(e) => update('availabilityLabel', e.target.value)}
              placeholder="Open to opportunities"
            />
          </Field>
          <Switch checked={form.seekingEmployment} onChange={(v) => update('seekingEmployment', v)} label="Seeking employment" />
          <Switch checked={form.openToFreelance} onChange={(v) => update('openToFreelance', v)} label="Open to freelance" />
          <Switch checked={form.openToRelocation} onChange={(v) => update('openToRelocation', v)} label="Open to relocation" />
          <Switch checked={form.openToInternship} onChange={(v) => update('openToInternship', v)} label="Open to internship" />
        </div>
      </AdminSection>

      <AdminSection title="Imagery" description="Profile photo and hero image.">
        <div className="grid gap-5 sm:grid-cols-2">
          <MediaField
            label="Profile image"
            value={form.profileImageId}
            asset={media.resolve(form.profileImageId)}
            kind="IMAGE"
            onChange={(id) => update('profileImageId', id)}
          />
          <MediaField
            label="Hero image"
            value={form.heroImageId}
            asset={media.resolve(form.heroImageId)}
            kind="IMAGE"
            onChange={(id) => update('heroImageId', id)}
          />
        </div>
      </AdminSection>

      <AdminSection title="SEO defaults" description="Used when the profile page is shared.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SEO title" htmlFor="p-seotitle">
            <Input id="p-seotitle" value={form.seoTitle} onChange={(e) => update('seoTitle', e.target.value)} />
          </Field>
          <Field label="SEO description" htmlFor="p-seodesc">
            <Input id="p-seodesc" value={form.seoDescription} onChange={(e) => update('seoDescription', e.target.value)} />
          </Field>
        </div>
      </AdminSection>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

interface SocialDraft {
  id?: string;
  label: string;
  url: string;
  icon: string;
  visible: boolean;
}

function SocialLinks() {
  const toast = useToast();
  const query = useAsync<SocialLink[]>(() => api.get<SocialLink[]>('/api/admin/social-links').then((r) => r.data), []);
  const [editing, setEditing] = useState<SocialDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SocialLink | null>(null);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body = { label: editing.label, url: editing.url, icon: editing.icon || 'link', visible: editing.visible };
      if (editing.id) await api.put(`/api/admin/social-links/${editing.id}`, body);
      else await api.post('/api/admin/social-links', { ...body, sortOrder: query.data?.length ?? 0 });
      toast.success('Saved');
      setEditing(null);
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/admin/social-links/${toDelete.id}`);
      setToDelete(null);
      await query.reload();
      toast.success('Removed');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AdminSection
      title="Social links"
      description="Links shown in the footer and contact area."
      actions={
        <Button size="sm" onClick={() => setEditing({ label: '', url: '', icon: 'link', visible: true })} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
          Add link
        </Button>
      }
    >
      {query.loading ? (
        <LoadingBlock />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState title="No social links" description="Add a GitHub, LinkedIn or other profile link." />
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {(query.data ?? []).map((link) => (
            <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {link.label}
                  {!link.visible ? <Badge variant="muted">Hidden</Badge> : null}
                </p>
                <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                  {link.icon} · {link.url}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing({ id: link.id, label: link.label, url: link.url, icon: link.icon, visible: link.visible })}
                  iconLeft={<Pencil className="h-4 w-4" aria-hidden="true" />}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(link)} iconLeft={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit link' : 'Add social link'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={!editing?.label || !editing?.url}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <Field label="Label" htmlFor="s-label" required>
              <Input id="s-label" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
            </Field>
            <Field label="URL" htmlFor="s-url" required hint="Must be a full https:// URL.">
              <Input id="s-url" value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://" />
            </Field>
            <Field label="Icon" htmlFor="s-icon" hint="One of the supported icon names.">
              <Select
                id="s-icon"
                value={editing.icon}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                options={ICON_NAMES.map((name) => ({ value: name, label: name }))}
              />
            </Field>
            <Switch checked={editing.visible} onChange={(v) => setEditing({ ...editing, visible: v })} label="Visible" />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remove link?"
        description={toDelete ? `“${toDelete.label}” will be removed from the site.` : ''}
        destructive
        confirmLabel="Remove"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </AdminSection>
  );
}

interface NavDraft {
  id?: string;
  label: string;
  href: string;
  icon: string;
  visible: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
}

function NavigationEditor() {
  const toast = useToast();
  const query = useAsync<NavigationItem[]>(() => api.get<NavigationItem[]>('/api/admin/navigation').then((r) => r.data), []);
  const [editing, setEditing] = useState<NavDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<NavigationItem | null>(null);

  const items = useMemo(() => query.data ?? [], [query.data]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body = {
        label: editing.label,
        href: editing.href,
        icon: editing.icon,
        visible: editing.visible,
        isExternal: editing.isExternal,
        openInNewTab: editing.openInNewTab,
      };
      if (editing.id) await api.put(`/api/admin/navigation/${editing.id}`, body);
      else await api.post('/api/admin/navigation', { ...body, sortOrder: items.length });
      toast.success('Saved');
      setEditing(null);
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/admin/navigation/${toDelete.id}`);
      setToDelete(null);
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AdminSection
      title="Navigation"
      description="The primary site navigation. Order follows sort order."
      actions={
        <Button
          size="sm"
          onClick={() => setEditing({ label: '', href: '/', icon: '', visible: true, isExternal: false, openInNewTab: false })}
          iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Add item
        </Button>
      }
    >
      {query.loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState title="No navigation items" description="Add links to the main navigation." />
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 opacity-30" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {item.label}
                    {!item.visible ? <Badge variant="muted">Hidden</Badge> : null}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                    {item.href}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEditing({
                      id: item.id,
                      label: item.label,
                      href: item.href,
                      icon: item.icon,
                      visible: item.visible,
                      isExternal: item.isExternal,
                      openInNewTab: item.openInNewTab,
                    })
                  }
                  iconLeft={<Pencil className="h-4 w-4" aria-hidden="true" />}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(item)} iconLeft={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit navigation item' : 'Add navigation item'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={!editing?.label || !editing?.href}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <Field label="Label" htmlFor="n-label" required>
              <Input id="n-label" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
            </Field>
            <Field label="Href" htmlFor="n-href" required hint="A path like /projects or a full URL.">
              <Input id="n-href" value={editing.href} onChange={(e) => setEditing({ ...editing, href: e.target.value })} />
            </Field>
            <Field label="Icon" htmlFor="n-icon" hint="Optional icon name.">
              <Select
                id="n-icon"
                value={editing.icon}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                placeholder="No icon"
                options={ICON_NAMES.map((name) => ({ value: name, label: name }))}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Switch checked={editing.visible} onChange={(v) => setEditing({ ...editing, visible: v })} label="Visible" />
              <Switch checked={editing.isExternal} onChange={(v) => setEditing({ ...editing, isExternal: v })} label="External" />
              <Switch checked={editing.openInNewTab} onChange={(v) => setEditing({ ...editing, openInNewTab: v })} label="New tab" />
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remove navigation item?"
        description={toDelete ? `“${toDelete.label}” will be removed.` : ''}
        destructive
        confirmLabel="Remove"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </AdminSection>
  );
}
