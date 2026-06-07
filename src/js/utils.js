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
