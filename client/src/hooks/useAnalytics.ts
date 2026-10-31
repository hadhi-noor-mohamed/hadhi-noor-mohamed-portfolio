import { useEffect } from 'react';
import { api } from '@/lib/api';

export type AnalyticsType =
  | 'PAGE_VIEW'
  | 'PROJECT_VIEW'
  | 'BLOG_VIEW'
  | 'RESUME_DOWNLOAD'
  | 'CONTACT_SUBMIT'
  | 'EXTERNAL_LINK_CLICK'
  | 'PROJECT_LINK_CLICK';

let lastPath: string | null = null;

/** Fire-and-forget analytics beacon. Never throws, never blocks the UI. */
export function trackAnalytics(
  type: AnalyticsType,
  payload: { path?: string; projectId?: string; blogPostId?: string; referrer?: string; label?: string } = {},
): void {
  const body = {
    type,
    path: payload.path ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
    projectId: payload.projectId,
    blogPostId: payload.blogPostId,
    referrer: payload.referrer ?? (typeof document !== 'undefined' ? document.referrer : ''),
    label: payload.label ?? '',
  };
  void api.post('/api/public/analytics', body).catch(() => undefined);
}

/** Records a single PAGE_VIEW per distinct path per session navigation. */
export function usePageView(path: string, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    if (lastPath === path) return;
    lastPath = path;
    trackAnalytics('PAGE_VIEW', { path });
  }, [path, enabled]);
}
