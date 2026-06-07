/**
 * Application Entry Point and Initialization
 */

import * as Sentry from '@sentry/browser';
import { 
  updateAccentColor, 
  buildNavbar, 
  buildHero, 
  buildFAB, 
  buildFooter, 
  initCardSpotlight,
  buildContact
} from './ui.js';
import { 
  buildProducts, 
  buildProductsFromDb, 
  showCatalogLoading,
  initProductGridEvents
} from './catalog.js';
import { initTheme, initThemeToggle } from './theme.js';
import { 
  auth, 
  updateAuthUI, 
  refreshAccessToken, 
  setupAccountModal,
  openAccountModal,
  openOrderHistoryModal,
  fetchSavedAddresses,
  apiCall
} from './auth.js';
import { 
  localCart, 
  renderCart, 
  updateCartBadge, 
  placeOrderViaWhatsApp,
  activeTab,
  setActiveTab,
  appliedPromo,
  setAppliedPromo,
  updateCartSummary,
  checkoutPayment,
  setCheckoutPayment,
  checkoutShipping,
  setCheckoutShipping,
  mountStripeCardElement
} from './cart.js';

// Global variables
export let dbProducts = [];
export let paymentConfig = { stripeEnabled: false };
export let stripeInstance = null;
export let enabledFeatures = [];

// Expose variables on window for easy module access
window.dbProducts = dbProducts;
window.paymentConfig = paymentConfig;
window.stripeInstance = stripeInstance;
window.enabledFeatures = enabledFeatures;

// Initialize Sentry dynamically from config if DSN is provided
if (window.catalogConfig?.sentryDsn) {
  Sentry.init({
    dsn: window.catalogConfig.sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  console.log('Sentry monitoring initialized');
}

export function isFeatureEnabled(featureKey) {
  return enabledFeatures.some(f => f.featureKey === featureKey);
}
window.isFeatureEnabled = isFeatureEnabled;

export function getDbProductByName(name) {
  if (!dbProducts.length) return null;
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return dbProducts.find(p => {
    const cleanP = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanP.includes(clean) || clean.includes(cleanP);
  });
}
window.getDbProductByName = getDbProductByName;

async function fetchDbProducts() {
  const cfg = window.catalogConfig;
  try {
    const res = await fetch(`${cfg.apiUrl}/products?size=200`);
    if (res.ok) {
      const data = await res.json();
      dbProducts = data.data?.content || [];
      window.dbProducts = dbProducts;
      console.log('Successfully fetched database products:', dbProducts.length);
    }
  } catch (e) {
    console.warn('Backend offline or unreachable. Falling back to WhatsApp checkout.', e);
  }
}

async function fetchPaymentConfig() {
  const cfg = window.catalogConfig;
  try {
    const res = await fetch(`${cfg.apiUrl}/config/payment`);
    if (res.ok) {
      const data = await res.json();
      paymentConfig = data.data || { stripeEnabled: false };
      window.paymentConfig = paymentConfig;
      if (paymentConfig.stripeEnabled && cfg.enableStripePayment !== false && paymentConfig.publishableKey) {
        window.stripeInstance = window.Stripe(paymentConfig.publishableKey);
        stripeInstance = window.stripeInstance;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch payment config.', e);
  }
}

async function fetchEnabledFeatures() {
  const cfg = window.catalogConfig;
  try {
    const res = await fetch(`${cfg.apiUrl}/features/enabled`);
    if (res.ok) {
      const data = await res.json();
      enabledFeatures = data.data || [];
      window.enabledFeatures = enabledFeatures;
      console.log('Successfully fetched enabled features:', enabledFeatures);
    }
  } catch (e) {
    console.warn('Failed to fetch enabled features.', e);
  }
}

function setupCartEventListeners() {
  const cartToggle = document.getElementById('cartToggle');
  const cartClose = document.getElementById('cartClose');
  const cartOverlay = document.getElementById('cartOverlay');
  const trackOrdersBtn = document.getElementById('trackOrdersBtn');
  const sideTrackOrdersBtn = document.getElementById('sideTrackOrdersBtn');
  const ordersModalClose = document.getElementById('ordersModalClose');
  const ordersModal = document.getElementById('ordersModal');
  const allOffersModalClose = document.getElementById('allOffersModalClose');
  const allOffersModal = document.getElementById('allOffersModal');
  const cartActionBtn = document.getElementById('cartActionBtn');

  if (cartToggle) {
    cartToggle.addEventListener('click', () => {
      document.getElementById('cartDrawer').classList.add('active');
      document.getElementById('cartOverlay').classList.add('active');
      setActiveTab('cart');
      renderCart();
    });
  }
  
  if (cartClose) cartClose.addEventListener('click', closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);
  
  function closeCartDrawer() {
    document.getElementById('cartDrawer').classList.remove('active');
    document.getElementById('cartOverlay').classList.remove('active');
  }

  // Apply Promo Code Listener (small box inside cart)
  const applyPromoBtn = document.getElementById('applyPromoBtn');
  if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', async () => {
      const input = document.getElementById('promoCodeInput');
      const msg = document.getElementById('promoMessage');
      if (!input || !msg) return;

      const code = input.value.trim();
      if (!code) {
        msg.style.display = 'block';
        msg.style.background = 'rgba(232, 56, 79, 0.1)';
        msg.style.border = '1px solid rgba(232, 56, 79, 0.3)';
        msg.style.color = '#E8384F';
        msg.textContent = 'Please enter a coupon code';
        return;
      }

      msg.style.display = 'block';
      msg.style.background = 'rgba(255, 255, 255, 0.05)';
      msg.style.border = '1px solid var(--border-glass)';
      msg.style.color = '#ffffff';
      msg.innerHTML = '<span class="icon-animate">⏳</span> Validating code...';

      const subtotal = localCart.getSubtotal();

      try {
        const res = await apiCall(`/discounts/validate?code=${encodeURIComponent(code)}&subtotal=${subtotal}`);
        const data = await res.json();

        if (res.ok && data.data) {
          setAppliedPromo(data.data);
          msg.style.display = 'block';
          msg.style.background = 'rgba(16, 185, 129, 0.1)';
          msg.style.border = '1px solid rgba(16, 185, 129, 0.3)';
          msg.style.color = '#10B981';
          msg.innerHTML = `✓ Coupon <strong>${code}</strong> applied successfully (${appliedPromo.valueType === 'PERCENTAGE' ? appliedPromo.value + '%' : window.catalogConfig.currency + appliedPromo.value} OFF)!`;
          updateCartSummary();
        } else {
          setAppliedPromo(null);
          msg.style.display = 'block';
          msg.style.background = 'rgba(232, 56, 79, 0.1)';
          msg.style.border = '1px solid rgba(232, 56, 79, 0.3)';
          msg.style.color = '#E8384F';
          msg.innerHTML = `✗ ${data.message || 'Invalid or expired promo code'}`;
          updateCartSummary();
        }
      } catch (e) {
        setAppliedPromo(null);
        msg.style.display = 'block';
        msg.style.background = 'rgba(232, 56, 79, 0.1)';
        msg.style.border = '1px solid rgba(232, 56, 79, 0.3)';
        msg.style.color = '#E8384F';
        msg.textContent = '✗ Failed to validate promo code';
        updateCartSummary();
      }
    });
  }
  
  if (trackOrdersBtn) {
    trackOrdersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openOrderHistoryModal();
    });
  }
  
  if (sideTrackOrdersBtn) {
    sideTrackOrdersBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openOrderHistoryModal();
    });
  }
  
  if (ordersModalClose) {
    ordersModalClose.addEventListener('click', () => {
      ordersModal.classList.remove('active');
    });
  }
  
  if (ordersModal) {
    ordersModal.addEventListener('click', (e) => {
      if (e.target === ordersModal) {
        ordersModal.classList.remove('active');
      }
    });
  }

  // Offers Link to Modal setup
  document.querySelectorAll('a[href="#offers"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sideMenu = document.getElementById('sideMenu');
      const menuOverlay = document.getElementById('menuOverlay');
      if (sideMenu) sideMenu.classList.remove('active');
      if (menuOverlay) menuOverlay.classList.remove('active');
      
      if (allOffersModal) allOffersModal.classList.add('active');
    });
  });
  
  if (allOffersModalClose) {
    allOffersModalClose.addEventListener('click', () => {
      allOffersModal.classList.remove('active');
    });
  }
  
  if (allOffersModal) {
    allOffersModal.addEventListener('click', (e) => {
      if (e.target === allOffersModal) {
        allOffersModal.classList.remove('active');
      }
    });
  }

  if (cartActionBtn) {
    cartActionBtn.addEventListener('click', () => {
      if (activeTab === 'cart') {
        if (!dbProducts.length) {
          placeOrderViaWhatsApp();
        } else {
          setActiveTab('checkout');
          renderCart();
        }
      } else if (activeTab === 'checkout') {
        import('./cart.js').then(cart => cart.handleCheckoutSubmit());
      }
    });
  }
  
  // Delegate card adding & variant chips clicking
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('qty-minus')) {
      const name = e.target.getAttribute('data-name');
      const qtyValEl = document.getElementById(`qty-${name.replace(/\s+/g, '-')}`);
      if (qtyValEl) {
        let val = parseInt(qtyValEl.textContent, 10);
        if (val > 1) {
          qtyValEl.textContent = val - 1;
        }
      }
    }
    
    if (e.target.classList.contains('qty-plus')) {
      const name = e.target.getAttribute('data-name');
      const qtyValEl = document.getElementById(`qty-${name.replace(/\s+/g, '-')}`);
      if (qtyValEl) {
        let val = parseInt(qtyValEl.textContent, 10);
        qtyValEl.textContent = val + 1;
      }
    }
    
    if (e.target.classList.contains('btn-add-cart') || e.target.closest('.btn-add-cart')) {
      const btn = e.target.classList.contains('btn-add-cart') ? e.target : e.target.closest('.btn-add-cart');
      const name = btn.getAttribute('data-name');
      const safeName = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
      
      const card = btn.closest('.product-card');
      const selectedChip = card ? card.querySelector('.variant-chip.selected') : null;
      let variantId = null;
      let sizeLabel = null;
      let price = parseFloat(btn.getAttribute('data-price'));
      let weight = parseFloat(btn.getAttribute('data-weight')) || 500;
      
      if (selectedChip) {
        variantId = selectedChip.getAttribute('data-variant-id');
        price = parseFloat(selectedChip.getAttribute('data-price'));
        sizeLabel = selectedChip.getAttribute('data-label');
        weight = parseFloat(selectedChip.getAttribute('data-weight')) || 500;
      }
      
      const qtyValEl = document.getElementById(`qty-${safeName}`);
      const qty = qtyValEl ? parseInt(qtyValEl.textContent, 10) : 1;
      
      let imgUrl = 'images/logo/brand logo.jpeg';
      const cardImg = card ? (card.querySelector('.card-slide img') || card.querySelector('.product-image-wrapper img')) : null;
      if (cardImg) imgUrl = cardImg.getAttribute('src');
      
      localCart.add(name, price, qty, imgUrl, variantId, sizeLabel, weight);
      import('./cart.js').then(c => c.triggerFlyToCartAnimation(btn));
      
      const originalContent = btn.innerHTML;
      btn.classList.add('added');
      btn.innerHTML = `<span>✓ Added</span>`;
      setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = originalContent;
        if (qtyValEl) qtyValEl.textContent = '1';
      }, 1200);
    }
  });

  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.variant-chip');
    if (!chip) return;
    
    const allChips = chip.closest('.variant-chips')?.querySelectorAll('.variant-chip');
    if (allChips) allChips.forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');

    const price = parseFloat(chip.getAttribute('data-price'));
    const comparePrice = parseFloat(chip.getAttribute('data-compare')) || 0;
    const productName = chip.getAttribute('data-product-name');
    const safeName = productName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

    const badge = document.getElementById(`price-badge-${safeName}`);
    if (badge) {
      let badgeHTML = '';
      if (comparePrice && comparePrice > price) {
        badgeHTML += `<span class="original-price">${window.catalogConfig.currency}${comparePrice}</span> `;
      }
      badgeHTML += `<span>${window.catalogConfig.currency}${price}</span>`;
      badge.innerHTML = badgeHTML;
    }

    const card = chip.closest('.product-card');
    if (card) {
      const addBtn = card.querySelector('.btn-add-cart');
      if (addBtn) addBtn.setAttribute('data-price', price);
    }
  });
}

async function initStore() {
  await fetchDbProducts();
  await fetchPaymentConfig();
  await fetchEnabledFeatures();
  updateCartBadge();
  updateAuthUI();
  setupCartEventListeners();
  
  if (dbProducts.length > 0) {
    try {
      const catRes = await fetch(`${window.catalogConfig.apiUrl}/categories`);
      if (catRes.ok) {
        const catData = await catRes.json();
        const categories = catData.data || [];
        buildProductsFromDb(dbProducts, categories);
      } else {
        buildProductsFromDb(dbProducts, [{ id: dbProducts[0]?.categoryId, name: 'Our Collection', sortOrder: 0, productCount: dbProducts.length }]);
      }
    } catch (e) {
      console.warn('Could not load categories, grouping all products together.', e);
      const fallbackCats = {};
      dbProducts.forEach(p => {
        if (!fallbackCats[p.categoryId]) fallbackCats[p.categoryId] = { id: p.categoryId, name: p.categoryName || 'Collection', sortOrder: 0, productCount: 0 };
        fallbackCats[p.categoryId].productCount++;
      });
      buildProductsFromDb(dbProducts, Object.values(fallbackCats));
    }
  } else {
    buildProducts();
  }

  if (auth.isLoggedIn()) {
    await fetchSavedAddresses();
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === 'true' && urlParams.get('orderId')) {
    const orderId = urlParams.get('orderId');
    localCart.clear();
    updateCartBadge();
    
    setActiveTab('success');
    
    try {
      const res = await apiCall(`/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('mb_lastOrder', JSON.stringify(data.data));
      }
    } catch(e) {
      console.warn("Could not fetch order details for success screen", e);
    }
    
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartDrawer) cartDrawer.classList.add('active');
    if (cartOverlay) cartOverlay.classList.add('active');
    renderCart();
    
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function setupTermsModal() {
  const termsModal = document.getElementById('termsModal');
  const termsModalClose = document.getElementById('termsModalClose');
  if (!termsModal) return;

  if (termsModalClose) {
    termsModalClose.addEventListener('click', () => {
      termsModal.classList.remove('active');
    });
  }
  termsModal.addEventListener('click', (e) => {
    if (e.target === termsModal) {
      termsModal.classList.remove('active');
    }
  });

  document.body.addEventListener('click', (e) => {
    if (e.target.id === 'modalTermsLink' || e.target.id === 'checkoutTermsLink') {
      e.preventDefault();
      termsModal.classList.add('active');
    }
  });
}

function setupPromoModal() {
  const promoModal = document.getElementById('promoModal');
  const openPromoBtn = document.getElementById('openPromoModalBtn');
  const closePromoBtn = document.getElementById('promoModalClose');
  const applyPromoBtn = document.getElementById('modalApplyPromoBtn');
  const promoInput = document.getElementById('modalPromoInput');
  const promoMsg = document.getElementById('modalPromoMessage');

  if (openPromoBtn) {
    openPromoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (promoMsg) promoMsg.style.display = 'none';
      if (promoInput) promoInput.value = '';
      if (promoModal) promoModal.classList.add('active');
    });
  }

  if (closePromoBtn) {
    closePromoBtn.addEventListener('click', () => {
      if (promoModal) promoModal.classList.remove('active');
    });
  }

  if (promoModal) {
    promoModal.addEventListener('click', (e) => {
      if (e.target === promoModal) {
        promoModal.classList.remove('active');
      }
    });
  }

  if (applyPromoBtn && promoInput && promoMsg) {
    applyPromoBtn.addEventListener('click', async () => {
      const code = promoInput.value.trim();
      if (!code) {
        promoMsg.style.display = 'block';
        promoMsg.style.background = 'rgba(232, 56, 79, 0.1)';
        promoMsg.style.border = '1px solid rgba(232, 56, 79, 0.3)';
        promoMsg.style.color = '#E8384F';
        promoMsg.textContent = 'Please enter a coupon code';
        return;
      }

      promoMsg.style.display = 'block';
      promoMsg.style.background = 'rgba(255, 255, 255, 0.05)';
      promoMsg.style.border = '1px solid var(--border-glass)';
      promoMsg.style.color = '#ffffff';
      promoMsg.innerHTML = '<span class="icon-animate">⏳</span> Validating code...';

      const subtotal = localCart.getSubtotal();

      try {
        const res = await apiCall(`/discounts/validate?code=${encodeURIComponent(code)}&subtotal=${subtotal}`);
        
        if (res.status === 401 || res.status === 403) {
          promoMsg.style.display = 'block';
          promoMsg.style.background = 'rgba(232, 56, 79, 0.1)';
          promoMsg.style.border = '1px solid rgba(232, 56, 79, 0.3)';
          promoMsg.style.color = '#E8384F';
          promoMsg.innerHTML = '✗ Please sign in/register to apply coupon codes';
          setAppliedPromo(null);
          updateCartSummary();
          return;
        }

        const data = await res.json();

        if (res.ok && data.data) {
          setAppliedPromo(data.data);
          promoMsg.style.display = 'block';
          promoMsg.style.background = 'rgba(16, 185, 129, 0.1)';
          promoMsg.style.border = '1px solid rgba(16, 185, 129, 0.3)';
          promoMsg.style.color = '#10B981';
          promoMsg.innerHTML = `✓ Coupon <strong>${code}</strong> applied successfully (${appliedPromo.valueType === 'PERCENTAGE' ? appliedPromo.value + '%' : window.catalogConfig.currency + appliedPromo.value} OFF)!`;
          
          updateCartSummary();
          
          setTimeout(() => {
            if (promoModal) promoModal.classList.remove('active');
          }, 1500);
        } else {
          setAppliedPromo(null);
          promoMsg.style.display = 'block';
          promoMsg.style.background = 'rgba(232, 56, 79, 0.1)';
          promoMsg.style.border = '1px solid rgba(232, 56, 79, 0.3)';
          promoMsg.style.color = '#E8384F';
          promoMsg.innerHTML = `✗ ${data.message || 'Invalid or expired promo code'}`;
          updateCartSummary();
        }
      } catch (e) {
        setAppliedPromo(null);
        promoMsg.style.display = 'block';
        promoMsg.style.background = 'rgba(232, 56, 79, 0.1)';
        promoMsg.style.border = '1px solid rgba(232, 56, 79, 0.3)';
        promoMsg.style.color = '#E8384F';
        promoMsg.textContent = '✗ Failed to validate promo code';
        updateCartSummary();
      }
    });
  }
}

function setupProductDetailModal() {
  const modal = document.getElementById('productDetailModal');
  const close = document.getElementById('productDetailClose');
  if (!modal) return;
  if (close) {
    close.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

// Global exposure for window handlers
window.openAccountModal = openAccountModal;

async function init() {
  initTheme();
  initThemeToggle();
  updateAccentColor();
  buildNavbar();
  buildHero();
  showCatalogLoading();
  initProductGridEvents();
  buildFAB();
  buildFooter();
  buildContact();
  initCardSpotlight();

  await initStore();

  if (auth.isLoggedIn()) {
    await refreshAccessToken();
  }

  setupAccountModal();
  setupPromoModal();
  setupTermsModal();
  setupProductDetailModal();
  updateAuthUI();

  document.title = `${window.catalogConfig.businessName} — ${window.catalogConfig.tagline || 'Product Catalog'}`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
