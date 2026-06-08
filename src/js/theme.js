/**
 * Site theme: Velvet (dark) ↔ Ivory (light)
 */

export const THEMES = {
  VELVET: 'velvet',
  IVORY: 'ivory',
};

const STORAGE_KEY = 'mb_theme';

export function getTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEMES.IVORY || saved === THEMES.VELVET) return saved;
  } catch (_) { /* ignore */ }
  return THEMES.VELVET;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const resolved = theme === THEMES.IVORY ? THEMES.IVORY : THEMES.VELVET;

  root.setAttribute('data-theme', resolved);
  root.classList.toggle('theme-ivory', resolved === THEMES.IVORY);

  try {
    localStorage.setItem(STORAGE_KEY, resolved);
  } catch (_) { /* ignore */ }

  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.setAttribute('aria-label', resolved === THEMES.VELVET ? 'Switch to light theme' : 'Switch to dark theme');
  });

  document.dispatchEvent(new CustomEvent('mb-theme-change', { detail: { theme: resolved } }));
}

export function toggleTheme() {
  applyTheme(getTheme() === THEMES.VELVET ? THEMES.IVORY : THEMES.VELVET);
}

export function initTheme() {
  applyTheme(getTheme());
}

export function initThemeToggle() {
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
  });
}
