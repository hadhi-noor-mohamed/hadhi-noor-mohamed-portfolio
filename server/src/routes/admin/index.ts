import { Router } from 'express';
import { requireAuth, requireCsrf } from '../../middleware/session.js';
import { adminAuthRouter } from './auth.js';
import { adminOverviewRouter } from './overview.js';
import { adminProfileRouter } from './profile.js';
import { adminSkillsRouter } from './skills.js';
import { adminProjectsRouter } from './projects.js';
import { adminTimelineRouter, adminShowcaseRouter } from './timeline.js';
import { adminJourneyRouter } from './journey.js';
import { adminBlogRouter } from './blog.js';
import { adminMediaRouter } from './media.js';
import { adminPagesRouter } from './pages.js';
import { adminInboxRouter } from './inbox.js';
import { adminAnalyticsRouter } from './analytics.js';
import { adminBackupRouter } from './backup.js';
import { adminAccountRouter } from './account.js';

/**
 * The admin API.
 *
 * `attachSession` runs at the application level so `req.user` is always
 * populated before anything else. The two middlewares below enforce
 * authorization and CSRF for every admin route — the login/logout/profile
 * session routes are mounted before the guard because they must be reachable
 * without a session.
 */
export const adminRouter = Router();

// The auth router owns its own session attachment and CSRF handling for login.
adminRouter.use(adminAuthRouter);
// Everything else must be authenticated and CSRF-verified (`attachSession`
// already ran once at the application level).
adminRouter.use(requireAuth, requireCsrf);

adminRouter.use('/', adminOverviewRouter);
adminRouter.use('/', adminProfileRouter);
adminRouter.use('/', adminSkillsRouter);
adminRouter.use('/', adminProjectsRouter);
adminRouter.use('/', adminTimelineRouter);
adminRouter.use('/', adminShowcaseRouter);
adminRouter.use('/', adminJourneyRouter);
adminRouter.use('/', adminBlogRouter);
adminRouter.use('/', adminMediaRouter);
adminRouter.use('/', adminPagesRouter);
adminRouter.use('/', adminInboxRouter);
adminRouter.use('/', adminAnalyticsRouter);
adminRouter.use('/', adminBackupRouter);
adminRouter.use('/', adminAccountRouter);
