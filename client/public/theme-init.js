/*
 * Apply the stored theme before first paint to avoid a flash of the wrong
 * theme. Kept as an external file so the production CSP can use
 * `script-src 'self'` without allowing inline scripts.
 */
(function () {
  try {
    var stored = localStorage.getItem('hpf-theme-mode');
    var mode = stored || 'system';
    var dark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.themeMode = mode;
  } catch (e) {
    // Storage or matchMedia can be unavailable in privacy-restricted contexts.
  }
})();
