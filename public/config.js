/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║          MAYILBLOSSOM CATALOG CONFIGURATION              ║
 * ║                                                          ║
 * ║  Edit ONLY this file to update your catalog.             ║
 * ║  Do NOT touch index.html unless you know what you do.    ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * PRODUCT IMAGES:
 *   - Drop your product images into the "images/" folder
 *   - Name them like:  flower-name-$price.jpg
 *     Example: jathi-poo-$30.jpg  →  Name: "Jathi Poo", Price: "$30"
 *   - Then add the filename to the "products" array below
 *
 * HERO IMAGES:
 *   - These are the big banner images at the top of the page
 *   - Use your best product photos for maximum impact
 */

const MB_PROD_ORIGIN = 'https://mayilblooms.work.gd';

function mbIsLocal() {
  return typeof window !== 'undefined'
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
}

function mbIsGitHubPages() {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
}

function mbS3Prefix() {
  if (mbIsLocal()) return 'http://localhost:9000';
  if (mbIsGitHubPages()) return MB_PROD_ORIGIN + '/s3';
  return '/s3';
}

function mbApiUrl() {
  if (typeof window !== 'undefined' && window.ENV && window.ENV.API_URL) {
    return window.ENV.API_URL;
  }
  if (mbIsLocal()) return 'http://localhost:8080/api';
  if (mbIsGitHubPages()) return MB_PROD_ORIGIN + '/api';
  return '/api';
}

const catalogConfig = {

  // ─── Business Info ────────────────────────────────────────
  businessName: "Mayil blooms",
  tagline: "Premium Artificial Flowers — Delivery Available within USA",
  description: "Wholesale & retail supplier of high-quality artificial flowers, garlands, and decorations. Long-lasting beauty that never wilts.",

  // Path to your logo image (place the file in the images/ folder)
  logo: "images/logo/brand logo.jpeg",

  // ─── Pricing & Discounts ──────────────────────────────────
  // Set to true to show the Credit Card (Stripe) payment option at checkout.
  // Set to false to hide Credit Card checkout and only allow Cash on Delivery.
  enableStripePayment: true,

  // ─── Taxes & Shipping ──────────────────────────────────────
  taxPercentage: 7, // Tax percentage applied at checkout (e.g., 7 for 7%)
  deliveryFee: 7.99, // Base delivery fee for shipping
  freeShippingThreshold: 100, // Free shipping if subtotal is greater than or equal to this amount

  // ─── Contact Details ──────────────────────────────────────
  contactDetails: {
    phone: "+1 9472759100",
    whatsapp: "+19472759100",
    email: "mayilbloomsusa@gmail.com",
    instagram: "https://www.instagram.com/mayilblooms/",
    youtube: "https://youtube.com/@mayilblooms?si=iVFXLzdmqX_64wpF",
    facebook: "https://www.facebook.com/share/18UF7pNgmC/?mibextid=wwXIfr",
    address: "Farmington Hills, Michigan",
  },

  // ─── Hero Banner Slides ───────────────────────────────────
  // These cycle at the top and synchronize with titles and festival messages!
  // Image URLs are resolved dynamically based on environment:
  //   - Local:        http://localhost:9000/mayilblossom/...
  //   - Oracle Cloud: /s3/mayilblossom/... (proxied by Caddy to MinIO)
  //   - GitHub Pages: https://mayilblooms.work.gd/s3/mayilblossom/...
  heroSlides: [
    {
      image: mbS3Prefix() + "/mayilblossom/products/flowers/BLOOMED%20JASMINE%20MALLIPOO%2016INCH.jpg",
      title: "Exquisite Artificial Flowers",
      subtitle: "Premium quality that lasts forever — for temples & weddings"
    },
    {
      image: mbS3Prefix() + "/mayilblossom/products/flowers/CLOSED%20MALLIPOO%20STRING%2016INCH-1.jpeg",
      title: "Long Lasting Garlands",
      subtitle: "Handcrafted beauty that never wilts"
    },
    {
      image: mbS3Prefix() + "/mayilblossom/products/crafts/Realistic%20Jasmine%209%20pieces%20Jadai%20Set%20full%20set.webp",
      title: "Specialty Hair Crafts",
      subtitle: "Beautifully crafted jasmine accessories for every occasion"
    }
  ],

  // ─── Appearance ───────────────────────────────────────────
  accentColor: "#C8102E",
  currency: "$",
  imagesFolder: "images/product",

  /**
   * Maps full product image URLs to catalog-sized thumbnails in MinIO.
   * Thumbnails are generated at upload: products/thumbs/{name}-{200|400|800}.jpg
   */
  imageResizeUrl(src, width) {
    if (!src) return src;
    const w = width <= 200 ? 200 : width <= 400 ? 400 : 800;
    if (src.includes('/products/thumbs/')) return src;
    if (src.includes('/products/') || src.includes('/mayilblossom/products/')) {
      return src
        .replace('/products/', '/products/thumbs/')
        .replace(/\.(jpe?g|png|webp)(\?.*)?$/i, `-${w}.jpg`);
    }
    return src;
  },

  apiUrl: mbApiUrl(),
};

if (typeof window !== 'undefined') {
  window.catalogConfig = catalogConfig;
}

