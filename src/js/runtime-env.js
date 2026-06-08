/** Shared host detection for Oracle Cloud (root) vs GitHub Pages (subpath). */

export const PROD_ORIGIN = 'https://mayilblooms.work.gd';

export function isLocalHost() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

export function isGitHubPages() {
  return window.location.hostname.endsWith('github.io');
}

/** Repo subpath on GitHub Pages, e.g. "/mayilblooms-usa". Empty on Oracle Cloud. */
export function getBasePath() {
  if (!isGitHubPages()) return '';
  const match = window.location.pathname.match(/^(\/[^/]+)/);
  return match ? match[1] : '';
}

export function resolveApiUrl() {
  if (window.ENV?.API_URL) return window.ENV.API_URL;
  if (isLocalHost()) return 'http://localhost:8080/api';
  if (isGitHubPages()) return `${PROD_ORIGIN}/api`;
  return '/api';
}

/** Turn relative /s3/... paths into absolute URLs when off Oracle Cloud. */
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (isLocalHost() && url.startsWith('/s3')) {
    return url.replace(/^\/s3/, 'http://localhost:9000');
  }
  if (url.startsWith('/') && (isGitHubPages() || isLocalHost())) {
    if (isGitHubPages()) return `${PROD_ORIGIN}${url}`;
  }
  return url;
}
