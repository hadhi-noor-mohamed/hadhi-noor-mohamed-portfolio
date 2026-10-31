import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Resets scroll position on every navigation. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}
