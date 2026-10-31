/**
 * Types mirroring the JSON shapes returned by the portfolio API.
 * Kept intentionally close to the server serialisers so the client and server
 * stay in sync without a shared codegen step.
 */

export type PublishState = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED';
export type ProjectStatus = 'CONCEPT' | 'IN_PROGRESS' | 'PROTOTYPE' | 'COMPLETED' | 'ARCHIVED';
export type TimelineType =
  | 'EDUCATION'
  | 'INTERNSHIP'
  | 'WORK'
  | 'TRAINING'
  | 'WORKSHOP'
  | 'VOLUNTEER'
  | 'CERTIFICATION';
export type ContactCategory =
  | 'JOB_OPPORTUNITY'
  | 'PROJECT_COLLABORATION'
  | 'TECHNICAL_DISCUSSION'
  | 'FEEDBACK'
  | 'OTHER';
export type ContactStatus = 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';
export type MediaKind = 'IMAGE' | 'PDF' | 'VIDEO' | 'DOCUMENT' | 'OTHER';

export interface MediaDTO {
  id: string;
  url: string;
  kind: MediaKind;
  mimeType: string;
  alt: string;
  width: number | null;
  height: number | null;
  size: number;
  displayLabel: string;
  originalName: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface Profile {
  id: string;
  fullName: string;
  headline: string;
  intro: string;
  aboutHtml: string;
  location: string;
  email: string;
  phone: string;
  wordmark: string;
  availabilityLabel: string;
  availabilityEnabled: boolean;
  seekingEmployment: boolean;
  openToFreelance: boolean;
  openToRelocation: boolean;
  openToInternship: boolean;
  techBadges: string[];
  seoTitle: string;
  seoDescription: string;
  profileImageId?: string | null;
  heroImageId?: string | null;
  profileImage?: MediaDTO | null;
  heroImage?: MediaDTO | null;
}

export interface SocialLink {
  id: string;
  label: string;
  url: string;
  icon: string;
  sortOrder: number;
  visible: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  sortOrder: number;
  visible: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
}

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
  visible: boolean;
  _count?: { skills: number };
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string | null;
  category?: SkillCategory | null;
  icon: string;
  logoMediaId?: string | null;
  logo?: MediaDTO | null;
  proficiencyLabel: string;
  proficiencyPercent: number | null;
  featured: boolean;
  sortOrder: number;
  published: boolean;
  projects?: Array<{ id: string; title: string; slug: string }>;
  relatedProjects?: Array<{ id: string; title: string; slug: string }>;
  projectIds?: string[];
}

export interface ProjectTechnology {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  category: string;
  status: ProjectStatus;
  role?: string;
  featured: boolean;
  startDate?: string | null;
  endDate?: string | null;
  technologies: ProjectTechnology[];
  cover: MediaDTO | null;
  state?: PublishState;
  sortOrder?: number;
}

export interface ProjectImage {
  id: string;
  caption: string;
  alt: string;
  media: MediaDTO | null;
}

export interface ProjectDocument {
  id: string;
  label: string;
  media: MediaDTO | null;
}

export interface ProjectDetail {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  overview: string;
  problemStatement: string;
  approach: string;
  solution: string;
  outcome: string;
  keyFeatures: string[];
  challenges: string[];
  learnings: string[];
  category: string;
  role: string;
  teamInfo: string;
  startDate?: string | null;
  endDate?: string | null;
  status: ProjectStatus;
  githubUrl: string;
  liveDemoUrl: string;
  demoVideoUrl: string;
  featured: boolean;
  state: PublishState;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  cover: MediaDTO | null;
  report: MediaDTO | null;
  gallery: ProjectImage[];
  documents: ProjectDocument[];
  technologies: ProjectTechnology[];
  relatedPosts: Array<{ id: string; title: string; slug: string; excerpt: string; publishedAt: string | null }>;
  relatedJourney: Array<{ id: string; title: string; slug: string; date: string }>;
  relatedProjects: ProjectSummary[];
}

/** Admin project row (includes relations and media ids). */
export interface AdminProject extends Omit<ProjectDetail, 'technologies' | 'relatedPosts' | 'relatedJourney' | 'relatedProjects'> {
  coverMediaId: string | null;
  reportMediaId: string | null;
  images: Array<{ id: string; mediaId: string; caption: string; alt: string; media: MediaDTO }>;
  docs: Array<{ id: string; mediaId: string; label: string; media: MediaDTO }>;
  skills: ProjectTechnology[];
}

export interface TimelineEntry {
  id: string;
  type: TimelineType;
  organization: string;
  role: string;
  field: string;
  specialization: string;
  location: string;
  startDate?: string | null;
  endDate?: string | null;
  current: boolean;
  grade: string;
  hours: string;
  description: string[];
  technologies: string[];
  logoMediaId?: string | null;
  documentMediaId?: string | null;
  logo?: MediaDTO | null;
  document?: MediaDTO | null;
  url: string;
  sortOrder: number;
  visible: boolean;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  issueDate?: string | null;
  description: string;
  credentialUrl: string;
  imageMediaId?: string | null;
  pdfMediaId?: string | null;
  image?: MediaDTO | null;
  pdf?: MediaDTO | null;
  skillTags: string[];
  featured: boolean;
  sortOrder: number;
  visible: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  organization: string;
  date?: string | null;
  description: string;
  imageMediaId?: string | null;
  pdfMediaId?: string | null;
  image?: MediaDTO | null;
  pdf?: MediaDTO | null;
  verificationUrl: string;
  projectId?: string | null;
  featured: boolean;
  sortOrder: number;
  visible: boolean;
}

export interface JourneySummary {
  id: string;
  title: string;
  slug: string;
  date: string;
  description: string;
  tags: string[];
  featured: boolean;
  externalUrl: string;
  videoUrl: string;
  project?: { id: string; title: string; slug: string } | null;
  cover: MediaDTO | null;
  state?: PublishState;
  sortOrder?: number;
}

export interface JourneyDetail extends JourneySummary {
  contentHtml: string;
  video: MediaDTO | null;
  gallery: MediaDTO[];
  videoMediaId?: string | null;
  coverMediaId?: string | null;
  projectId?: string | null;
  images?: string[];
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  readingMinutes: number;
  publishedAt: string | null;
  featured: boolean;
  tags: BlogTag[];
  cover: MediaDTO | null;
  state?: PublishState;
}

export interface BlogDetail extends BlogSummary {
  contentHtml: string;
  viewCount: number;
  seoTitle: string;
  seoDescription: string;
  project?: { id: string; title: string; slug: string } | null;
  related: BlogSummary[];
  contentMd?: string;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primary: string;
  secondary: string;
  accent: string;
  pink: string;
  background: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  muted: string;
  border: string;
  lightBackground: string;
  lightSurface: string;
  lightText: string;
  lightMuted: string;
  headingFont: string;
  bodyFont: string;
  monospaceFont: string;
  fontScale: number;
  borderRadius: string;
  cardStyle: 'elevated' | 'glass' | 'bordered' | 'flat';
  shadowIntensity: number;
  iconStyle: 'line' | 'filled' | 'duotone';
  animation: 'none' | 'subtle' | 'moderate' | 'expressive';
  navigationStyle: 'glass' | 'solid' | 'floating' | 'bordered';
  buttonStyle: 'gradient' | 'solid' | 'outlined' | 'soft';
  gradients: string[];
  density: 'compact' | 'normal' | 'relaxed';
  sectionLayout: 'default' | 'compact' | 'centered' | 'bento';
}

export interface ThemeRecord {
  id: string;
  name: string;
  presetKey: string;
  isActive: boolean;
  config: ThemeConfig;
  draft?: ThemeConfig | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PageSection {
  id: string;
  key: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  layout: string;
  variant: string;
  cardStyle: string;
  background: string;
  accent: string;
  spacing: string;
  animation: string;
  enabled: boolean;
  sortOrder: number;
  draftConfig?: Record<string, unknown> | null;
  publishedAt?: string | null;
}

export interface SiteSettings {
  id: string;
  siteUrl: string;
  siteTitle: string;
  siteDescription: string;
  defaultOgImageId?: string | null;
  defaultOgImage?: MediaDTO | null;
  robots: string;
  analyticsEnabled: boolean;
  resumePrimaryMode: 'UPLOADED' | 'GENERATED';
  footerNote: string;
  privacyNote: string;
}

export interface ResumeVersion {
  id: string;
  title: string;
  versionLabel: string;
  mediaId: string;
  media?: MediaDTO;
  isActive: boolean;
  publicDownload: boolean;
  downloadFilename: string;
  notes: string;
  createdAt: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  category: ContactCategory;
  message: string;
  status: ContactStatus;
  consent: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'EDITOR';
  totpEnabled: boolean;
}

export interface OverviewCounts {
  projectsTotal: number;
  projectsPublished: number;
  projectsDraft: number;
  projectsTrash: number;
  skills: number;
  categories: number;
  posts: number;
  postsPublished: number;
  journey: number;
  education: number;
  media: number;
  messages: number;
  unread: number;
  certCount: number;
  achievements: number;
}

export interface Overview {
  counts: OverviewCounts;
  setupChecklist: Array<{ key: string; label: string; done: boolean }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    summary: string | null;
    createdAt: string;
    user?: { name: string } | null;
  }>;
  recentMessages: Message[];
  hasProfile: boolean;
  hasActiveResume: boolean;
}

export interface Analytics {
  range: { days: number; since: string };
  collected: boolean;
  firstEventAt: string | null;
  lastEventAt: string | null;
  totals: {
    events: number;
    pageViews: number;
    projectViews: number;
    blogViews: number;
    externalLinkClicks: number;
    projectLinkClicks: number;
    contactMessages: number;
    resumeDownloads: number;
    contactMessagesAllTime: number;
  };
  byType: Record<string, number>;
  series: Array<{ date: string; pageViews: number; projectViews: number; blogViews: number; downloads: number; messages: number }>;
  topProjects: Array<{ id: string; title: string; slug: string; state: PublishState; views: number }>;
  topPosts: Array<{ id: string; title: string; slug: string; state: PublishState; views: number }>;
  measurementNote: string;
}

export interface SearchResult {
  type: 'project' | 'blog' | 'journey' | 'skill';
  id: string;
  title: string;
  slug: string;
  description: string;
  cover: MediaDTO | null;
}

export interface BootstrapProfile {
  profile: Profile | null;
  socialLinks: SocialLink[];
  navigation: NavigationItem[];
}

export interface BootstrapFull {
  navigation: NavigationItem[];
  sections: PageSection[];
  theme: ThemeRecord | null;
  settings: SiteSettings;
}
