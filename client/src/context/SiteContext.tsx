/* eslint-disable react-refresh/only-export-components -- context modules intentionally export a provider and its hook */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { applyThemeConfig } from '@/lib/theme';
import type {
  BootstrapFull,
  BootstrapProfile,
  NavigationItem,
  PageSection,
  Profile,
  SiteSettings,
  SocialLink,
  ThemeRecord,
} from '@/types/api';

interface SiteContextValue {
  profile: Profile | null;
  socialLinks: SocialLink[];
  navigation: NavigationItem[];
  sections: PageSection[];
  theme: ThemeRecord | null;
  settings: SiteSettings | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  sectionByKey: (key: string) => PageSection | undefined;
  isSectionEnabled: (key: string) => boolean;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [theme, setTheme] = useState<ThemeRecord | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [base, full] = await Promise.all([
        api.get<BootstrapProfile>('/api/public/bootstrap'),
        api.get<BootstrapFull>('/api/public/bootstrap-full'),
      ]);
      if (!mounted.current) return;
      setProfile(base.data.profile);
      setSocialLinks(base.data.socialLinks);
      setNavigation(base.data.navigation.length ? base.data.navigation : full.data.navigation);
      setSections(full.data.sections);
      setTheme(full.data.theme);
      setSettings(full.data.settings);
      applyThemeConfig(full.data.theme?.config ?? null);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : 'Unable to load site content');
      // Fall back to the built-in theme so the page still renders.
      applyThemeConfig(null);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const sectionByKey = useCallback((key: string) => sections.find((section) => section.key === key), [sections]);
  const isSectionEnabled = useCallback(
    (key: string) => {
      const section = sections.find((item) => item.key === key);
      return section ? section.enabled : true;
    },
    [sections],
  );

  const value = useMemo<SiteContextValue>(
    () => ({
      profile,
      socialLinks,
      navigation,
      sections,
      theme,
      settings,
      loading,
      error,
      reload: load,
      sectionByKey,
      isSectionEnabled,
    }),
    [profile, socialLinks, navigation, sections, theme, settings, loading, error, load, sectionByKey, isSectionEnabled],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const context = useContext(SiteContext);
  if (!context) throw new Error('useSite must be used inside <SiteProvider>');
  return context;
}
