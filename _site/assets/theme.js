// Light / dark toggle. The choice is remembered when the browser allows it.
document.getElementById('theme')?.addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('clickery-theme', root.dataset.theme); } catch { /* private window: the choice just is not kept */ }
});
