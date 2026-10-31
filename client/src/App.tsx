import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { LoadingBlock } from '@/components/ui/Spinner';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { HomePage } from '@/pages/public/HomePage';
import { AboutPage } from '@/pages/public/AboutPage';
import { SkillsPage } from '@/pages/public/SkillsPage';
import { ProjectsPage } from '@/pages/public/ProjectsPage';
import { ProjectDetailPage } from '@/pages/public/ProjectDetailPage';
import { ExperiencePage } from '@/pages/public/ExperiencePage';
import { AchievementsPage } from '@/pages/public/AchievementsPage';
import { JourneyPage } from '@/pages/public/JourneyPage';
import { JourneyDetailPage } from '@/pages/public/JourneyDetailPage';
import { BlogPage } from '@/pages/public/BlogPage';
import { BlogDetailPage } from '@/pages/public/BlogDetailPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { ResumePage } from '@/pages/public/ResumePage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';

// Admin lives behind auth and is code-split so the public bundle stays small.
const AdminLoginPage = lazy(() => import('@/pages/admin/LoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminOverviewPage = lazy(() => import('@/pages/admin/OverviewPage').then((m) => ({ default: m.AdminOverviewPage })));
const AdminProfilePage = lazy(() => import('@/pages/admin/ProfilePage').then((m) => ({ default: m.AdminProfilePage })));
const AdminProjectsPage = lazy(() => import('@/pages/admin/ProjectsAdminPage').then((m) => ({ default: m.AdminProjectsPage })));
const AdminProjectEditorPage = lazy(() => import('@/pages/admin/ProjectEditorPage').then((m) => ({ default: m.AdminProjectEditorPage })));
const AdminSkillsPage = lazy(() => import('@/pages/admin/SkillsAdminPage').then((m) => ({ default: m.AdminSkillsPage })));
const AdminTimelinePage = lazy(() => import('@/pages/admin/TimelineAdminPage').then((m) => ({ default: m.AdminTimelineAdminPage })));
const AdminShowcasePage = lazy(() => import('@/pages/admin/ShowcaseAdminPage').then((m) => ({ default: m.AdminShowcaseAdminPage })));
const AdminJourneyPage = lazy(() => import('@/pages/admin/JourneyAdminPage').then((m) => ({ default: m.AdminJourneyAdminPage })));
const AdminJourneyEditorPage = lazy(() => import('@/pages/admin/JourneyEditorPage').then((m) => ({ default: m.AdminJourneyEditorPage })));
const AdminBlogPage = lazy(() => import('@/pages/admin/BlogAdminPage').then((m) => ({ default: m.AdminBlogPage })));
const AdminBlogEditorPage = lazy(() => import('@/pages/admin/BlogEditorPage').then((m) => ({ default: m.AdminBlogEditorPage })));
const AdminMediaPage = lazy(() => import('@/pages/admin/MediaAdminPage').then((m) => ({ default: m.AdminMediaPage })));
const AdminInboxPage = lazy(() => import('@/pages/admin/InboxAdminPage').then((m) => ({ default: m.AdminInboxPage })));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AnalyticsAdminPage').then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminPageBuilderPage = lazy(() => import('@/pages/admin/PageBuilderPage').then((m) => ({ default: m.AdminPageBuilderPage })));
const AdminThemeStudioPage = lazy(() => import('@/pages/admin/ThemeStudioPage').then((m) => ({ default: m.AdminThemeStudioPage })));
const AdminSeoPage = lazy(() => import('@/pages/admin/SeoAdminPage').then((m) => ({ default: m.AdminSeoPage })));
const AdminBackupPage = lazy(() => import('@/pages/admin/BackupAdminPage').then((m) => ({ default: m.AdminBackupPage })));
const AdminAccountPage = lazy(() => import('@/pages/admin/AccountPage').then((m) => ({ default: m.AdminAccountPage })));

function AdminFallback() {
  return <LoadingBlock label="Loading dashboard…" />;
}

export function App() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<AdminFallback />}>
        <Routes location={location}>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:slug" element={<ProjectDetailPage />} />
            <Route path="experience" element={<ExperiencePage />} />
            <Route path="achievements" element={<AchievementsPage />} />
            <Route path="journey" element={<JourneyPage />} />
            <Route path="journey/:slug" element={<JourneyDetailPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/:slug" element={<BlogDetailPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="resume" element={<ResumePage />} />
            <Route path="404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="profile" element={<AdminProfilePage />} />
            <Route path="projects" element={<AdminProjectsPage />} />
            <Route path="projects/new" element={<AdminProjectEditorPage />} />
            <Route path="projects/:id" element={<AdminProjectEditorPage />} />
            <Route path="skills" element={<AdminSkillsPage />} />
            <Route path="timeline" element={<AdminTimelinePage />} />
            <Route path="showcase" element={<AdminShowcasePage />} />
            <Route path="journey" element={<AdminJourneyPage />} />
            <Route path="journey/new" element={<AdminJourneyEditorPage />} />
            <Route path="journey/:id" element={<AdminJourneyEditorPage />} />
            <Route path="blog" element={<AdminBlogPage />} />
            <Route path="blog/new" element={<AdminBlogEditorPage />} />
            <Route path="blog/:id" element={<AdminBlogEditorPage />} />
            <Route path="media" element={<AdminMediaPage />} />
            <Route path="inbox" element={<AdminInboxPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="page-builder" element={<AdminPageBuilderPage />} />
            <Route path="theme" element={<AdminThemeStudioPage />} />
            <Route path="seo" element={<AdminSeoPage />} />
            <Route path="backup" element={<AdminBackupPage />} />
            <Route path="account" element={<AdminAccountPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
