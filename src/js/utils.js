/**
 * Escape HTML for safe text insertion.
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Clean product name by removing extensions, variations, and debris.
 */
export function cleanProductName(filename) {
  let name = filename.includes('/') ? filename.split('/').pop() : filename;
  name = name.replace(/\.[^.]+$/, '');
  const dollarIndex = name.lastIndexOf('$');
  if (dollarIndex !== -1) name = name.substring(0, dollarIndex);

  const itemsToRemove = [
    '16INCH', '16 INCH', '8INCH', '8 INCH', 'STRING', 'COPY',
    'FRONT', 'BACK', 'MEDIUM', 'SMALL', 'LARGE', 'FULL SET',
    '-', '_', '(', ')'
  ];

  let cleaned = name.toUpperCase();
  itemsToRemove.forEach(item => {
    cleaned = cleaned.split(item).join(' ');
  });

  cleaned = cleaned.replace(/\s+/g, ' ').replace(/\d+/g, '').trim();
  return titleCase(cleaned.toLowerCase());
}

/**
 * Parse price and availability from filename.
 */
export function parsePrice(filename) {
  const match = filename.match(/\$/);
  let parsedPrice = null;
  if (match) {
    const priceMatch = filename.match(/\$(\d+)/);
    parsedPrice = priceMatch ? parseInt(priceMatch[1], 10) : null;
  }
  const isUnavailable = filename.includes('_*');
  return {
    price: parsedPrice,
    isUnavailable
  };
}

/**
 * Convert string to title case.
 */
export function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Normalize product/image URLs for browser fetch.
 */
export function fixImageUrl(url) {
  if (!url) return '';
  let fixed = url
    .replace(/http:\/\/localhost:9000/g, 'http://127.0.0.1:9000')
    .replace(/http:\/\/localhost:3001/g, 'http://127.0.0.1:3001');
  try {
    const parsed = new URL(fixed, window.location.origin);
    parsed.pathname = parsed.pathname
      .split('/')
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join('/');
    return parsed.toString();
  } catch {
    return fixed.replace(/ /g, '%20');
  }
}

const GRID_IMAGE_WIDTHS = [200, 400, 800];
const GRID_IMAGE_SIZES = '(max-width: 480px) 45vw, (max-width: 768px) 45vw, 280px';
const HERO_IMAGE_WIDTHS = [640, 960, 1280];
const HERO_IMAGE_SIZES = '100vw';

/**
 * Optional resize hook: set catalogConfig.imageResizeUrl(src, width) when a CDN/imgproxy exists.
 * Without it, srcset is omitted so the browser does not request the same URL multiple times.
 */
export function imageUrlAtWidth(url, width) {
  const fixed = fixImageUrl(url);
  const resize = window.catalogConfig?.imageResizeUrl;
  if (typeof resize === 'function') {
    return resize(fixed, width);
  }
  return fixed;
}

function buildSrcset(url, widths) {
  const resize = window.catalogConfig?.imageResizeUrl;
  if (typeof resize !== 'function') return '';
  return widths
    .map((w) => `${escapeHtml(imageUrlAtWidth(url, w))} ${w}w`)
    .join(', ');
}

/**
 * Responsive <img> markup for catalog cards and hero slides.
 */
export function responsiveImageHtml(src, alt, {
  eager = false,
  widths = GRID_IMAGE_WIDTHS,
  sizes = GRID_IMAGE_SIZES,
  defaultWidth = 400,
  aspectWidth = 400,
  aspectHeight = 500,
} = {}) {
  const safeAlt = escapeHtml(alt);
  const safeSrc = escapeHtml(imageUrlAtWidth(src, defaultWidth));
  const srcset = buildSrcset(src, widths);
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const srcsetAttr = srcset ? ` srcset="${srcset}" sizes="${sizes}"` : '';

  return `<img src="${safeSrc}" alt="${safeAlt}" loading="${loading}" decoding="async"${priority}${srcsetAttr} width="${aspectWidth}" height="${aspectHeight}">`;
}

export function heroImageHtml(src, alt, eager = false) {
  return responsiveImageHtml(src, alt, {
    eager,
    widths: HERO_IMAGE_WIDTHS,
    sizes: HERO_IMAGE_SIZES,
    defaultWidth: 960,
    aspectWidth: 1280,
    aspectHeight: 720,
  });
}
