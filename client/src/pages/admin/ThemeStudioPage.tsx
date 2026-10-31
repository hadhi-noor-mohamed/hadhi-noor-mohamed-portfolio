import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Check, Palette, RotateCcw, Save, Sparkles, UploadCloud } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Switch } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminPageHeader, AdminSection } from '@/components/admin/AdminUI';
import { DEFAULT_THEME_CONFIG } from '@/lib/theme';
import { THEME_PRESETS } from '@/lib/theme-presets';
import type { ThemeConfig, ThemeRecord } from '@/types/api';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const isHex = (value: string) => HEX.test(value.trim());

const MODE_OPTIONS = ['system', 'light', 'dark'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
const CARD_OPTIONS = ['elevated', 'glass', 'bordered', 'flat'].map((v) => ({ value: v, label: v }));
const ICON_OPTIONS = ['line', 'filled', 'duotone'].map((v) => ({ value: v, label: v }));
const ANIMATION_OPTIONS = ['none', 'subtle', 'moderate', 'expressive'].map((v) => ({ value: v, label: v }));
const NAV_OPTIONS = ['glass', 'solid', 'floating', 'bordered'].map((v) => ({ value: v, label: v }));
const BUTTON_OPTIONS = ['gradient', 'solid', 'outlined', 'soft'].map((v) => ({ value: v, label: v }));
const DENSITY_OPTIONS = ['compact', 'normal', 'relaxed'].map((v) => ({ value: v, label: v }));
const LAYOUT_OPTIONS = ['default', 'compact', 'centered', 'bento'].map((v) => ({ value: v, label: v }));
const GRADIENT_OPTIONS = ['aurora', 'slate', 'ember', 'cyber'].map((v) => ({ value: v, label: v }));

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = `color-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        {isHex(value) ? (
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 shrink-0 cursor-pointer rounded border bg-transparent"
            style={{ borderColor: 'var(--border)' }}
            aria-label={`${label} colour picker`}
          />
        ) : null}
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </Field>
  );
}

function previewStyle(config: ThemeConfig, dark: boolean): CSSProperties {
  const vars: Record<string, string> = {
    '--brand-primary': config.primary,
    '--brand-secondary': config.secondary,
    '--brand-accent': config.accent,
    '--brand-pink': config.pink,
    '--font-heading': config.headingFont,
    '--font-body': config.bodyFont,
    '--radius': config.borderRadius,
    '--shadow-strength': String(config.shadowIntensity),
  };
  if (dark) {
    vars['--bg'] = config.background;
    vars['--surface'] = config.surface;
    vars['--surface-strong'] = config.surfaceStrong;
    vars['--text'] = config.text;
    vars['--muted'] = config.muted;
    vars['--border'] = config.border;
  } else {
    vars['--bg'] = config.lightBackground;
    vars['--surface'] = config.lightSurface;
    vars['--surface-strong'] = config.lightSurface;
    vars['--text'] = config.lightText;
    vars['--muted'] = config.lightMuted;
    vars['--border'] = 'rgba(15,23,42,0.12)';
  }
  return vars as CSSProperties;
}

export function AdminThemeStudioPage() {
  const toast = useToast();
  const query = useAsync<ThemeRecord>(() => api.get<ThemeRecord>('/api/admin/theme').then((r) => r.data), []);
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [presetKey, setPresetKey] = useState('aurora');
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [previewDark, setPreviewDark] = useState(true);

  const theme = query.data;

  useEffect(() => {
    if (!theme) return;
    const working = (theme.draft ?? theme.config) as ThemeConfig;
    setConfig({ ...DEFAULT_THEME_CONFIG, ...working });
    setPresetKey(theme.presetKey ?? 'aurora');
  }, [theme]);

  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify({ ...DEFAULT_THEME_CONFIG, ...(theme?.draft ?? theme?.config) }), [config, theme]);

  const set = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => setConfig((prev) => ({ ...prev, [key]: value }));

  const applyPreset = (key: string) => {
    const preset = THEME_PRESETS.find((p) => p.key === key);
    setPresetKey(key);
    if (preset) setConfig((prev) => ({ ...DEFAULT_THEME_CONFIG, ...prev, ...preset.config }));
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      await api.post('/api/admin/theme/draft', { config, presetKey });
      toast.success('Draft saved');
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      const preset = THEME_PRESETS.find((p) => p.key === presetKey);
      await api.post('/api/admin/theme/publish', { config, presetKey, name: preset?.name ?? 'Custom' });
      toast.success('Theme published');
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await api.post('/api/admin/theme/reset', {});
      toast.success('Theme reset to defaults');
      setConfirmReset(false);
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (query.loading) return <LoadingBlock label="Loading theme…" />;
  if (query.error || !theme) {
    return <EmptyState title="Theme unavailable" description="No theme is configured. Run the reset to create the default." action={<Button onClick={() => void reset()}>Reset to defaults</Button>} />;
  }

  const hasDraft = Boolean(theme.draft);

  return (
    <div>
      <AdminPageHeader
        title="Theme studio"
        description="Compose the look and feel of the public site. Changes stay in draft until published."
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)} iconLeft={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
              Reset
            </Button>
            <Button size="sm" variant="outline" loading={busy} onClick={() => void saveDraft()} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
              Save draft
            </Button>
            <Button size="sm" loading={busy} onClick={() => void publish()} iconLeft={<UploadCloud className="h-4 w-4" aria-hidden="true" />}>
              Publish theme
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="primary">{theme.name}</Badge>
        <Badge variant="muted">preset: {theme.presetKey}</Badge>
        {hasDraft ? <Badge variant="warning">Unpublished draft</Badge> : null}
        {dirty ? <Badge variant="info">Unsaved changes</Badge> : <Badge variant="success">Saved</Badge>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          <AdminSection title="Presets" description="Start from a designed base, then fine-tune.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {THEME_PRESETS.map((preset) => {
                const activePreset = presetKey === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset.key)}
                    className="rounded-xl border p-3 text-left transition hover:border-[var(--brand-primary)]"
                    style={{ borderColor: activePreset ? 'var(--brand-primary)' : 'var(--border)' }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{preset.name}</span>
                      {activePreset ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" /> : null}
                    </span>
                    <span className="mt-1 block text-xs" style={{ color: 'var(--muted)' }}>
                      {preset.description}
                    </span>
                    <span className="mt-2 flex gap-1">
                      {[preset.config.primary ?? '#7c3aed', preset.config.secondary ?? '#2563eb', preset.config.accent ?? '#06b6d4'].map((c, i) => (
                        <span key={i} className="h-4 w-4 rounded-full border" style={{ backgroundColor: c, borderColor: 'var(--border)' }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </AdminSection>

          <AdminSection title="Brand colours">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ColorField label="Primary" value={config.primary} onChange={(v) => set('primary', v)} />
              <ColorField label="Secondary" value={config.secondary} onChange={(v) => set('secondary', v)} />
              <ColorField label="Accent" value={config.accent} onChange={(v) => set('accent', v)} />
              <ColorField label="Pink" value={config.pink} onChange={(v) => set('pink', v)} />
            </div>
          </AdminSection>

          <AdminSection title="Surfaces" description="Used in dark mode (and the dark preview).">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ColorField label="Background" value={config.background} onChange={(v) => set('background', v)} />
              <ColorField label="Surface" value={config.surface} onChange={(v) => set('surface', v)} />
              <ColorField label="Surface strong" value={config.surfaceStrong} onChange={(v) => set('surfaceStrong', v)} />
              <ColorField label="Text" value={config.text} onChange={(v) => set('text', v)} />
              <ColorField label="Muted" value={config.muted} onChange={(v) => set('muted', v)} />
              <ColorField label="Border" value={config.border} onChange={(v) => set('border', v)} />
            </div>
          </AdminSection>

          <AdminSection title="Light mode surfaces">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ColorField label="Light background" value={config.lightBackground} onChange={(v) => set('lightBackground', v)} />
              <ColorField label="Light surface" value={config.lightSurface} onChange={(v) => set('lightSurface', v)} />
              <ColorField label="Light text" value={config.lightText} onChange={(v) => set('lightText', v)} />
              <ColorField label="Light muted" value={config.lightMuted} onChange={(v) => set('lightMuted', v)} />
            </div>
          </AdminSection>

          <AdminSection title="Typography & shape">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Heading font" htmlFor="t-head">
                <Input id="t-head" value={config.headingFont} onChange={(e) => set('headingFont', e.target.value)} className="font-mono text-xs" />
              </Field>
              <Field label="Body font" htmlFor="t-body">
                <Input id="t-body" value={config.bodyFont} onChange={(e) => set('bodyFont', e.target.value)} className="font-mono text-xs" />
              </Field>
              <Field label="Monospace font" htmlFor="t-mono">
                <Input id="t-mono" value={config.monospaceFont} onChange={(e) => set('monospaceFont', e.target.value)} className="font-mono text-xs" />
              </Field>
              <Field label={`Font scale — ${config.fontScale.toFixed(2)}×`} htmlFor="t-scale">
                <input id="t-scale" type="range" min={0.85} max={1.3} step={0.05} value={config.fontScale} onChange={(e) => set('fontScale', Number(e.target.value))} className="w-full" />
              </Field>
              <Field label="Border radius" htmlFor="t-radius" hint="Any CSS length, e.g. 1rem or 12px.">
                <Input id="t-radius" value={config.borderRadius} onChange={(e) => set('borderRadius', e.target.value)} />
              </Field>
              <Field label={`Shadow intensity — ${config.shadowIntensity.toFixed(2)}`} htmlFor="t-shadow">
                <input id="t-shadow" type="range" min={0} max={1} step={0.05} value={config.shadowIntensity} onChange={(e) => set('shadowIntensity', Number(e.target.value))} className="w-full" />
              </Field>
            </div>
          </AdminSection>

          <AdminSection title="Behaviour">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Default mode" htmlFor="t-mode">
                <Select id="t-mode" value={config.mode} onChange={(e) => set('mode', e.target.value as ThemeConfig['mode'])} options={MODE_OPTIONS} />
              </Field>
              <Field label="Card style" htmlFor="t-card">
                <Select id="t-card" value={config.cardStyle} onChange={(e) => set('cardStyle', e.target.value as ThemeConfig['cardStyle'])} options={CARD_OPTIONS} />
              </Field>
              <Field label="Icon style" htmlFor="t-icon">
                <Select id="t-icon" value={config.iconStyle} onChange={(e) => set('iconStyle', e.target.value as ThemeConfig['iconStyle'])} options={ICON_OPTIONS} />
              </Field>
              <Field label="Animation" htmlFor="t-anim">
                <Select id="t-anim" value={config.animation} onChange={(e) => set('animation', e.target.value as ThemeConfig['animation'])} options={ANIMATION_OPTIONS} />
              </Field>
              <Field label="Navigation" htmlFor="t-nav">
                <Select id="t-nav" value={config.navigationStyle} onChange={(e) => set('navigationStyle', e.target.value as ThemeConfig['navigationStyle'])} options={NAV_OPTIONS} />
              </Field>
              <Field label="Buttons" htmlFor="t-btn">
                <Select id="t-btn" value={config.buttonStyle} onChange={(e) => set('buttonStyle', e.target.value as ThemeConfig['buttonStyle'])} options={BUTTON_OPTIONS} />
              </Field>
              <Field label="Density" htmlFor="t-density">
                <Select id="t-density" value={config.density} onChange={(e) => set('density', e.target.value as ThemeConfig['density'])} options={DENSITY_OPTIONS} />
              </Field>
              <Field label="Section layout" htmlFor="t-layout">
                <Select id="t-layout" value={config.sectionLayout} onChange={(e) => set('sectionLayout', e.target.value as ThemeConfig['sectionLayout'])} options={LAYOUT_OPTIONS} />
              </Field>
              <Field label="Gradient" htmlFor="t-grad">
                <Select id="t-grad" value={config.gradients?.[0] ?? 'aurora'} onChange={(e) => set('gradients', [e.target.value])} options={GRADIENT_OPTIONS} />
              </Field>
            </div>
          </AdminSection>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <AdminSection
            title="Live preview"
            description="A scoped sample — the real site applies these tokens."
            actions={
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {previewDark ? 'Dark' : 'Light'}
                </span>
                <Switch checked={previewDark} onChange={setPreviewDark} />
              </div>
            }
          >
            <div className="overflow-hidden rounded-xl border p-4" style={{ borderColor: 'var(--border)', ...previewStyle(config, previewDark) }}>
              <div style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
                <span
                  className="mb-3 inline-block rounded-full px-3 py-1 text-[0.7rem] font-medium"
                  style={{ backgroundImage: `linear-gradient(90deg, ${config.primary}, ${config.accent})`, color: '#fff' }}
                >
                  Available for opportunities
                </span>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>Hadhi Noor Mohamed H</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Software engineering student & full-stack developer</p>
                <div className="mt-4 flex gap-2">
                  <span
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={
                      config.buttonStyle === 'gradient'
                        ? { backgroundImage: `linear-gradient(120deg, ${config.primary}, ${config.secondary})`, color: '#fff' }
                        : config.buttonStyle === 'solid'
                          ? { backgroundColor: config.primary, color: '#fff' }
                          : { border: `1px solid ${config.primary}`, color: config.primary }
                    }
                  >
                    View projects
                  </span>
                  <span className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
                    Contact
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '0.75rem',
                      }}
                    >
                      <span style={{ display: 'block', height: 6, width: '60%', borderRadius: 4, background: i ? config.accent : config.primary }} />
                      <span style={{ display: 'block', height: 6, width: '90%', marginTop: 8, borderRadius: 4, backgroundColor: 'var(--muted)', opacity: 0.5 }} />
                      <span style={{ display: 'block', height: 6, width: '75%', marginTop: 6, borderRadius: 4, backgroundColor: 'var(--muted)', opacity: 0.3 }} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  {[config.primary, config.secondary, config.accent, config.pink].map((c) => (
                    <span key={c} className="h-5 w-5 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs" style={{ color: 'var(--muted)' }}>
              <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Preview shows colours, radius, gradients and button style. Publish to apply site-wide.
            </p>
          </AdminSection>

          <div className="mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Theme values are validated as structured JSON — no arbitrary CSS or scripts are accepted.</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset theme?"
        description="The published Aurora defaults will be restored and any draft discarded."
        destructive
        confirmLabel="Reset theme"
        onConfirm={() => void reset()}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
