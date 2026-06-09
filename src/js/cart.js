/**
 * Shopping Cart and Checkout Flow Module
 */

import { apiCall, auth, savedAddresses, fetchSavedAddresses } from './auth.js';
import { getTheme, THEMES } from './theme.js';

function getStripeAppearance() {
  const isIvory = getTheme() === THEMES.IVORY;
  if (isIvory) {
    return {
      theme: 'stripe',
      variables: {
        colorPrimary: '#9A7228',
        colorBackground: '#FFFFFF',
        colorText: '#1C1512',
        colorTextSecondary: 'rgba(28, 21, 18, 0.65)',
        colorTextPlaceholder: 'rgba(28, 21, 18, 0.42)',
        colorDanger: '#E8384F',
        fontFamily: 'Inter, sans-serif',
        borderRadius: '8px',
        spacingUnit: '4px',
        colorBorder: 'rgba(28, 21, 18, 0.15)',
      },
    };
  }
  return {
    theme: 'night',
    variables: {
      colorPrimary: '#D4A853',
      colorBackground: 'rgba(255, 255, 255, 0.05)',
      colorText: '#ffffff',
      colorDanger: '#E8384F',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '8px',
      spacingUnit: '4px',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
    },
  };
}

export let activeTab = 'cart'; // 'cart', 'checkout', 'success'
export let checkoutShipping = 'COURIER';
export let checkoutPayment = 'COD';
export let appliedPromo = null;
export let isRegistering = true;
export let isPlacingOrder = false;

export function setActiveTab(val) { activeTab = val; }
export function setCheckoutShipping(val) { checkoutShipping = val; }
export function setCheckoutPayment(val) { checkoutPayment = val; }
export function setAppliedPromo(val) { appliedPromo = val; }
export function setIsRegistering(val) { isRegistering = val; }
export function setIsPlacingOrder(val) { isPlacingOrder = val; }

export const localCart = {
  items: JSON.parse(localStorage.getItem('mb_cart') || '[]'),
  
  save() {
    localStorage.setItem('mb_cart', JSON.stringify(this.items));
    updateCartBadge();
  },
  
  add(productName, price, quantity, image, variantId = null, sizeLabel = null, weight = 500) {
    const existing = this.items.find(i => i.name === productName && i.variantId === variantId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({ name: productName, price, quantity, image, variantId, sizeLabel, weight });
    }
    this.save();
  },
  
  updateQty(productName, variantId, qty) {
    const existing = this.items.find(i => i.name === productName && i.variantId === variantId);
    if (existing) {
      existing.quantity = qty;
      if (existing.quantity <= 0) {
        this.items = this.items.filter(i => !(i.name === productName && i.variantId === variantId));
      }
      this.save();
    }
  },
  
  remove(productName, variantId) {
    this.items = this.items.filter(i => !(i.name === productName && i.variantId === variantId));
    this.save();
  },
  
  clear() {
    this.items = [];
    this.save();
  },
  
  getItemsCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },
  
  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
};

window.localCart = localCart; // Export to window for click triggers in inline cards

export function updateCartBadge() {
  const count = localCart.getItemsCount();
  const badge = document.getElementById('cartCount');
  if (badge) {
    badge.textContent = count;
  }
}

export function triggerFlyToCartAnimation(sourceElement) {
  const cartBtn = document.getElementById('cartToggle');
  if (!cartBtn || !sourceElement) return;

  const card = sourceElement.closest('.product-card');
  const imgEl = card ? card.querySelector('.product-image-wrapper img, .card-slide img') : null;

  const flyEl = document.createElement('div');
  flyEl.className = 'flying-item';

  if (imgEl) {
    const clone = document.createElement('img');
    clone.src = imgEl.src;
    clone.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    flyEl.appendChild(clone);
  } else {
    flyEl.textContent = '🌸';
    flyEl.style.fontSize = '20px';
    flyEl.style.display = 'flex';
    flyEl.style.alignItems = 'center';
    flyEl.style.justifyContent = 'center';
  }

  const srcRect = sourceElement.getBoundingClientRect();
  const cartRect = cartBtn.getBoundingClientRect();

  const startX = srcRect.left + srcRect.width / 2;
  const startY = srcRect.top + srcRect.height / 2;
  const endX = cartRect.left + cartRect.width / 2;
  const endY = cartRect.top + cartRect.height / 2;

  flyEl.style.left = startX + 'px';
  flyEl.style.top = startY + 'px';
  flyEl.style.setProperty('--fly-x', (endX - startX) + 'px');
  flyEl.style.setProperty('--fly-y', (endY - startY) + 'px');

  document.body.appendChild(flyEl);
  setTimeout(() => flyEl.remove(), 900);
}

export async function syncCartWithBackend() {
  if (!auth.isLoggedIn()) return;
  const syncItems = localCart.items.map(item => {
    const dbProd = window.getDbProductByName(item.name);
    return dbProd ? {
      productId: dbProd.id,
      variantId: item.variantId || null,
      quantity: item.quantity
    } : null;
  }).filter(Boolean);
  
  if (syncItems.length > 0) {
    try {
      await apiCall('/cart/sync', {
        method: 'POST',
        body: JSON.stringify(syncItems)
      });
      console.log('Cart synced with backend.');
    } catch (e) {
      console.warn('Failed to sync cart with backend.', e);
    }
  }
}

export function renderCart() {
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');
  const titleText = document.getElementById('cartTitleText');
  const actionBtn = document.getElementById('cartActionBtn');
  const drawer = document.getElementById('cartDrawer');
  const cfg = window.catalogConfig;

  if (drawer) {
    drawer.classList.toggle('checkout-mode', activeTab === 'checkout');
  }
  
  if (activeTab === 'cart') {
    titleText.textContent = "Your Cart";
    if (footer) footer.style.display = 'flex';
    const promoSec = document.getElementById('promoCodeSection');
    if (promoSec) promoSec.style.display = 'none';
    if (actionBtn) {
      actionBtn.textContent = "Proceed to Checkout";
      actionBtn.disabled = localCart.items.length === 0;
    }
    
    if (localCart.items.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some premium artificial flowers from our collection to get started.</p>
        </div>
      `;
      if (footer) footer.style.display = 'none';
      updateCartSummary();
      return;
    }
    
    body.innerHTML = localCart.items.map(item => {
      const sizeBadge = item.sizeLabel ? `<span class="cart-item-size">Size: ${item.sizeLabel}</span>` : '';
      return `
        <div class="cart-item">
          <img class="cart-item-img" src="${item.image}" alt="${item.name}">
          <div class="cart-item-details">
            <div class="cart-item-name">${item.name}</div>
            ${sizeBadge}
            <div class="cart-item-price">${cfg.currency}${item.price}</div>
            <div class="quantity-selector" style="margin-top: 8px; height: 32px;">
              <button class="qty-btn qty-minus-cart" data-name="${item.name.replace(/"/g, '&quot;')}" data-variant="${item.variantId || ''}">−</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn qty-plus-cart" data-name="${item.name.replace(/"/g, '&quot;')}" data-variant="${item.variantId || ''}">+</button>
            </div>
          </div>
          <button class="cart-item-remove" data-name="${item.name.replace(/"/g, '&quot;')}" data-variant="${item.variantId || ''}">✕</button>
        </div>
      `;
    }).join('');
    
    body.querySelectorAll('.qty-minus-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const variantId = btn.getAttribute('data-variant') || null;
        const item = localCart.items.find(i => i.name === name && i.variantId === variantId);
        if (item) {
          localCart.updateQty(name, variantId, item.quantity - 1);
          renderCart();
        }
      });
    });
    
    body.querySelectorAll('.qty-plus-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const variantId = btn.getAttribute('data-variant') || null;
        const item = localCart.items.find(i => i.name === name && i.variantId === variantId);
        if (item) {
          localCart.updateQty(name, variantId, item.quantity + 1);
          renderCart();
        }
      });
    });
    
    body.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const variantId = btn.getAttribute('data-variant') || null;
        localCart.remove(name, variantId);
        renderCart();
      });
    });
    
    updateCartSummary();
  } else if (activeTab === 'checkout') {
    titleText.textContent = "Checkout";
    if (footer) footer.style.display = 'flex';
    const promoSec = document.getElementById('promoCodeSection');
    if (promoSec) promoSec.style.display = 'flex';
    if (actionBtn) {
      actionBtn.textContent = "Place Order";
      actionBtn.disabled = false;
    }
    if (auth.isLoggedIn()) {
      fetchSavedAddresses().then(() => {
        renderCheckoutForm();
      });
    } else {
      renderCheckoutForm();
    }
  } else if (activeTab === 'success') {
    titleText.textContent = "Order Placed!";
    if (footer) footer.style.display = 'none';
    const promoSec = document.getElementById('promoCodeSection');
    if (promoSec) promoSec.style.display = 'none';
    renderSuccessScreen();
  }
}

export function updateCartSummary() {
  const cfg = window.catalogConfig;
  const subtotal = localCart.getSubtotal();
  const flatDiscount = cfg.flatDiscount || 0;
  
  let catalogDiscount = 0;
  if (flatDiscount > 0) {
    catalogDiscount = subtotal * (flatDiscount / 100);
    document.getElementById('summaryDiscountRow').style.display = 'flex';
    document.getElementById('summaryDiscount').textContent = `-${cfg.currency}${catalogDiscount.toFixed(2)}`;
  } else {
    document.getElementById('summaryDiscountRow').style.display = 'none';
  }

  if (appliedPromo && appliedPromo.minPurchaseAmount && subtotal < appliedPromo.minPurchaseAmount) {
    const minAmt = appliedPromo.minPurchaseAmount;
    appliedPromo = null;
    const msg = document.getElementById('promoMessage');
    if (msg) {
      msg.style.display = 'block';
      msg.style.background = 'rgba(232, 56, 79, 0.1)';
      msg.style.border = '1px solid rgba(232, 56, 79, 0.3)';
      msg.style.color = '#E8384F';
      msg.textContent = `Promo code removed: Min purchase of ${cfg.currency}${minAmt.toFixed(2)} required.`;
    }
  }

  const totalQty = localCart.items.reduce((sum, item) => sum + item.quantity, 0);
  let bulkDiscount = 0;
  if (subtotal >= 200) {
    bulkDiscount = subtotal * 0.10;
  } else if (totalQty >= 10) {
    bulkDiscount = subtotal * 0.10;
  } else if (totalQty >= 5) {
    bulkDiscount = subtotal * 0.05;
  }
  
  if (bulkDiscount > 0) {
    document.getElementById('summaryBulkDiscountRow').style.display = 'flex';
    document.getElementById('summaryBulkDiscount').textContent = `-${cfg.currency}${bulkDiscount.toFixed(2)}`;
  } else {
    document.getElementById('summaryBulkDiscountRow').style.display = 'none';
  }

  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.valueType === 'PERCENTAGE') {
      promoDiscount = subtotal * (appliedPromo.value / 100);
    } else {
      promoDiscount = Math.min(subtotal, appliedPromo.value);
    }
    document.getElementById('summaryPromoDiscountRow').style.display = 'flex';
    document.getElementById('summaryPromoLabel').innerHTML = `Promo Code (${appliedPromo.code}) <span id="removePromoBtn" style="color: var(--accent-light); cursor: pointer; margin-left: 8px; font-size: 12px; font-weight: 600; text-decoration: underline;">[Remove]</span>`;
    document.getElementById('summaryPromoDiscount').textContent = `-${cfg.currency}${promoDiscount.toFixed(2)}`;
    
    const removeBtn = document.getElementById('removePromoBtn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        appliedPromo = null;
        updateCartSummary();
        const modalInput = document.getElementById('modalPromoInput');
        if (modalInput) modalInput.value = '';
        const modalMsg = document.getElementById('modalPromoMessage');
        if (modalMsg) modalMsg.style.display = 'none';
      });
    }
  } else {
    document.getElementById('summaryPromoDiscountRow').style.display = 'none';
  }

  const totalDiscount = Math.min(subtotal, catalogDiscount + bulkDiscount + promoDiscount);
  const subtotalAfterDiscount = subtotal - totalDiscount;
  const taxRate = cfg.taxPercentage !== undefined ? cfg.taxPercentage / 100 : 0.07;
  const tax = subtotalAfterDiscount * taxRate;
  const taxLabel = document.getElementById('summaryTaxLabel');
  if (taxLabel) taxLabel.textContent = `Tax (${cfg.taxPercentage !== undefined ? cfg.taxPercentage : 7}%)`;
  
  let shipping = 0;
  const threshold = cfg.freeShippingThreshold !== undefined ? cfg.freeShippingThreshold : 100;
  const deliveryFee = cfg.deliveryFee !== undefined ? cfg.deliveryFee : 7.99;
  const shippingRow = document.getElementById('summaryShippingRow');
  if (activeTab === 'checkout' && checkoutShipping === 'COURIER') {
    shipping = subtotalAfterDiscount >= threshold ? 0 : deliveryFee;
    if (shippingRow) shippingRow.style.display = 'flex';
  } else {
    shipping = 0;
    if (shippingRow) shippingRow.style.display = 'none';
  }

  const shippingBanner = document.getElementById('shippingBanner');
  const shippingBannerText = document.getElementById('shippingBannerText');
  if (shippingBanner && shippingBannerText) {
    if (localCart.items.length === 0) {
      shippingBanner.style.display = 'none';
    } else {
      shippingBanner.style.display = 'block';
      if (activeTab === 'checkout' && checkoutPayment === 'ONLINE') {
        const feeRow = document.getElementById('summaryPaymentFeeRow');
        const paymentFeeLabel = document.getElementById('summaryPaymentFeeLabel');
        const paymentFeeValue = document.getElementById('summaryPaymentFee');
        
        if (paymentFeeLabel) paymentFeeLabel.textContent = "Processing Fee";
        if (paymentFeeValue) paymentFeeValue.textContent = "Calculated at checkout";
        if (feeRow) feeRow.style.display = 'flex';
      }
      if (subtotalAfterDiscount >= threshold) {
        shippingBanner.style.background = 'rgba(16, 185, 129, 0.08)';
        shippingBanner.style.color = '#10B981';
        shippingBannerText.innerHTML = '🎉 Congratulations! You have unlocked <strong>Free Courier Shipping</strong>!';
      } else {
        const diff = threshold - subtotalAfterDiscount;
        shippingBanner.style.background = 'rgba(212, 168, 83, 0.08)';
        shippingBanner.style.color = 'var(--gold-light)';
        shippingBannerText.innerHTML = `🚚 <strong>Free courier shipping</strong> if your purchase is more than $${threshold} (Spend <strong>$${diff.toFixed(2)}</strong> more to qualify)`;
      }
    }
  }
  
  let paymentFee = 0;
  if (activeTab === 'checkout' && (checkoutPayment === 'ONLINE')) {
    const baseTotal = subtotalAfterDiscount + tax + shipping;
    const feeLabel = document.getElementById('summaryPaymentFeeLabel');
    paymentFee = (baseTotal + 0.30) / 0.971 - baseTotal;
    if (feeLabel) feeLabel.textContent = 'Processing Fee';
    document.getElementById('summaryPaymentFeeRow').style.display = 'flex';
    document.getElementById('summaryPaymentFee').textContent = `${cfg.currency}${paymentFee.toFixed(2)}`;
  } else {
    const feeRow = document.getElementById('summaryPaymentFeeRow');
    if (feeRow) feeRow.style.display = 'none';
  }

  const courierDesc = document.getElementById('courierShippingDesc');
  if (courierDesc) {
    if (subtotalAfterDiscount >= 100) {
      courierDesc.textContent = 'Shipped via USPS (FREE 🎉)';
    } else {
      courierDesc.textContent = 'Shipped via USPS ($10.00)';
    }
  }
  
  const total = subtotalAfterDiscount + tax + shipping + paymentFee;
  
  document.getElementById('summarySubtotal').textContent = `${cfg.currency}${subtotal.toFixed(2)}`;
  document.getElementById('summaryShipping').textContent = shipping === 0 ? 'FREE' : `${cfg.currency}${shipping.toFixed(2)}`;
  document.getElementById('summaryTax').textContent = `${cfg.currency}${tax.toFixed(2)}`;
  document.getElementById('summaryTotal').textContent = `${cfg.currency}${total.toFixed(2)}`;
}

export function renderCheckoutForm() {
  const cfg = window.catalogConfig;
  const payConfig = window.paymentConfig;
  if (checkoutPayment === 'ONLINE' && (!payConfig?.stripeEnabled || cfg.enableStripePayment === false)) {
    checkoutPayment = 'COD';
  }
  const body = document.getElementById('cartBody');
  if (!body) return;
  
  let accountSectionHTML = '';
  if (auth.isLoggedIn()) {
    accountSectionHTML = `
      <div class="user-profile-bar">
        <div>
          <span>Logged in as <strong>${auth.user?.firstName || 'Customer'}</strong></span>
          <div style="font-size: 11px; color: var(--text-muted);">${auth.user?.email}</div>
        </div>
      </div>
    `;
  } else {
    accountSectionHTML = `
      <div class="checkout-tabs">
        <button class="checkout-tab ${isRegistering ? 'active' : ''}" id="tabRegister">Register</button>
        <button class="checkout-tab ${!isRegistering ? 'active' : ''}" id="tabLogin">Sign In</button>
      </div>
      
      <div id="authFormArea">
        ${isRegistering ? `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">First Name</label>
              <input type="text" class="form-input" id="checkoutFirstName" placeholder="John" required>
            </div>
            <div class="form-group">
              <label class="form-label">Last Name</label>
              <input type="text" class="form-input" id="checkoutLastName" placeholder="Doe" required>
            </div>
          </div>
          <div class="form-group" style="margin-top: 12px;">
            <label class="form-label">Phone Number</label>
            <input type="tel" class="form-input" id="checkoutPhone" placeholder="+1 (555) 000-0000" required>
          </div>
        ` : ''}
        
        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-input" id="checkoutEmail" placeholder="john.doe@example.com" required>
        </div>
        
        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" id="checkoutPassword" placeholder="••••••••" required>
        </div>
        ${isRegistering ? `
        <div class="form-group" style="margin-top: 12px; display: flex; align-items: flex-start; gap: 8px;">
          <input type="checkbox" id="checkoutTermsCheckbox" style="margin-top: 3px; cursor: pointer;">
          <label for="checkoutTermsCheckbox" style="font-size: 13px; color: var(--text-secondary); cursor: pointer; line-height: 1.4;">
            I agree to the <a href="#" id="checkoutTermsLink" style="color: var(--gold-light); text-decoration: underline;">Terms and Conditions</a> (Version 1.0)
          </label>
        </div>
        ` : ''}
      </div>
    `;
  }

  const shippingSectionHTML = `
    <div class="form-group" style="margin-top: 20px;">
      <label class="form-label">Delivery Method</label>
      <div class="radio-group">
        <label class="radio-label ${checkoutShipping === 'COURIER' ? 'active' : ''}" id="labelCourier">
          <input type="radio" name="shippingMethod" value="COURIER" ${checkoutShipping === 'COURIER' ? 'checked' : ''}>
          <span class="radio-title">Courier Delivery</span>
          <span class="radio-desc" id="courierShippingDesc">Shipped via USPS ($10.00)</span>
        </label>
        <label class="radio-label ${checkoutShipping === 'PICKUP' ? 'active' : ''}" id="labelPickup">
          <input type="radio" name="shippingMethod" value="PICKUP" ${checkoutShipping === 'PICKUP' ? 'checked' : ''}>
          <span class="radio-title">Store Pickup</span>
          <span class="radio-desc">Farmington Hills, MI (FREE)</span>
        </label>
      </div>
    </div>

    <div class="form-group" id="checkoutShippingAddressSection" style="margin-top: 16px; display: ${checkoutShipping === 'COURIER' ? 'block' : 'none'};">
      <label class="form-label">Shipping Address</label>
      ${savedAddresses.length > 0 ? `
        <select class="form-input" id="savedAddressSelect" style="margin-bottom: 10px; cursor: pointer;">
          <option value="">— Enter a new address —</option>
          ${savedAddresses.map(a => `<option value="${a.id}" data-addr1="${(a.addressLine1||'').replace(/"/g,'&quot;')}" data-addr2="${(a.addressLine2||'').replace(/"/g,'&quot;')}" data-city="${(a.city||'').replace(/"/g,'&quot;')}" data-state="${(a.state||'').replace(/"/g,'&quot;')}" data-zip="${(a.zipCode||'').replace(/"/g,'&quot;')}" data-country="${(a.country||'USA').replace(/"/g,'&quot;')}">${a.addressLine1}, ${a.city}${a.state ? ', ' + a.state : ''}</option>`).join('')}
        </select>
      ` : ''}
      <input type="text" class="form-input" id="checkoutAddr1" placeholder="123 Main St" required>
      <input type="text" class="form-input" id="checkoutAddr2" placeholder="Apt 4B (Optional)" style="margin-top: 8px;">
      <div class="form-row" style="margin-top: 8px;">
        <input type="text" class="form-input" id="checkoutCity" placeholder="City" required>
        <input type="text" class="form-input" id="checkoutState" placeholder="State" required>
      </div>
      <div class="form-row" style="margin-top: 8px;">
        <input type="text" class="form-input" id="checkoutZip" placeholder="ZIP Code" required>
        <input type="text" class="form-input" id="checkoutCountry" value="USA" readonly>
      </div>
    </div>

    <div class="form-group" style="margin-top: 16px;">
      <label class="form-label">Order Notes / Delivery Instructions</label>
      <textarea class="form-input" id="checkoutNotes" placeholder="Leave at the door, call before delivery, etc." style="height: 80px; resize: none;"></textarea>
    </div>
  `;

  let paymentSectionHTML = '';
  if (window.isFeatureEnabled('AllowPayment')) {
    paymentSectionHTML = `
      <div class="form-group" style="margin-top: 20px;">
        <label class="form-label">Payment Method</label>
        <div class="radio-group" style="display: flex; flex-direction: column; gap: 10px;">
          <label class="radio-label ${checkoutPayment === 'COD' ? 'active' : ''}" id="labelPaymentCOD">
            <input type="radio" name="paymentMethod" value="COD" ${checkoutPayment === 'COD' ? 'checked' : ''}>
            <span class="radio-title" id="codPaymentTitle">💵 ${checkoutShipping === 'PICKUP' ? 'Cash on Pickup' : 'Cash on Delivery'}</span>
            <span class="radio-desc" id="codPaymentDesc">Surcharge-free (No extra charges)</span>
          </label>
          ${(payConfig?.stripeEnabled && cfg.enableStripePayment !== false) ? `
            <label class="radio-label ${checkoutPayment === 'ONLINE' ? 'active' : ''}" id="labelPaymentStripe">
              <input type="radio" name="paymentMethod" value="ONLINE" ${checkoutPayment === 'ONLINE' ? 'checked' : ''}>
              <span class="radio-title">💳 Online Payment</span>
              <span class="radio-desc" id="stripePaymentDesc">Secure Card & Bank Transfer</span>
            </label>
          ` : ''}
          <label class="radio-label ${checkoutPayment === 'ZELLE' ? 'active' : ''}" id="labelPaymentZelle">
            <input type="radio" name="paymentMethod" value="ZELLE" ${checkoutPayment === 'ZELLE' ? 'checked' : ''}>
            <span class="radio-title">📱 Zelle (Manual Bank Transfer)</span>
            <span class="radio-desc" id="zellePaymentDesc">Zero fees (Manual confirmation)</span>
          </label>
        </div>
      </div>

      <div id="stripeCardContainer" style="display: ${checkoutPayment === 'ONLINE' ? 'block' : 'none'}; margin-top: 16px;">
        <label class="form-label" id="stripeElementLabel" style="margin-bottom: 8px;">Payment Details</label>
        <div id="stripe-card-element"></div>
        <div class="payment-errors" id="cardErrors"></div>
      </div>

      <div id="zelleInstructionsContainer" style="display: ${checkoutPayment === 'ZELLE' ? 'block' : 'none'}; margin-top: 16px;">
        <div class="zelle-instructions" style="background: rgba(212, 175, 55, 0.08); border: 1px solid var(--gold); border-radius: 8px; padding: 16px; color: var(--text-primary); font-size: 14px; line-height: 1.5;">
          <strong>Zelle Payment Instructions:</strong><br><br>
          1. Place your order to secure your items.<br>
          2. Send the exact total amount via Zelle to: <strong>5512408424</strong><br>
          3. Include your Order Number in the Zelle memo.<br>
          4. Your order will be marked as CONFIRMED once payment is received.
        </div>
      </div>
    `;
  } else {
    checkoutPayment = 'COD';
    paymentSectionHTML = `
      <div class="form-group" style="margin-top: 20px;">
        <label class="form-label">Payment Option</label>
        <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid var(--gold); border-radius: 8px; padding: 12px 16px; color: var(--gold-light); font-size: 13px; display: flex; align-items: start; gap: 8px;">
          <span style="font-size: 16px;">ℹ️</span>
          <div>
            <strong>Confirm without upfront payment</strong>
            <div style="margin-top: 4px; color: var(--text-secondary); font-size: 12px; line-height: 1.4;">
              Payment processing is currently offline. You can confirm your order now, and our support team will contact you for further details.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    <div class="checkout-form-container">
      <button class="btn btn-secondary" id="backToCartBtn" style="width: fit-content; padding: 8px 16px; margin-bottom: 8px; font-size: 13px;">
        ← Back to Cart
      </button>
      ${accountSectionHTML}
      ${shippingSectionHTML}
      ${paymentSectionHTML}
      <div id="checkoutError" class="payment-errors" style="margin-top: 12px; font-size: 14px; text-align: center;"></div>
    </div>
  `;

  if (auth.isLoggedIn() && savedAddresses.length > 0) {
    const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
    const savedAddrSelect = document.getElementById('savedAddressSelect');
    if (savedAddrSelect) {
      savedAddrSelect.value = defaultAddr.id;
    }
    document.getElementById('checkoutAddr1').value = defaultAddr.addressLine1 || '';
    document.getElementById('checkoutAddr2').value = defaultAddr.addressLine2 || '';
    document.getElementById('checkoutCity').value = defaultAddr.city || '';
    document.getElementById('checkoutState').value = defaultAddr.state || '';
    document.getElementById('checkoutZip').value = defaultAddr.zipCode || '';
    document.getElementById('checkoutCountry').value = defaultAddr.country || 'USA';
  }

  const backBtn = document.getElementById('backToCartBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      activeTab = 'cart';
      renderCart();
    });
  }

  const savedAddrSelect = document.getElementById('savedAddressSelect');
  if (savedAddrSelect) {
    savedAddrSelect.addEventListener('change', () => {
      const sel = savedAddrSelect.options[savedAddrSelect.selectedIndex];
      if (sel.value) {
        document.getElementById('checkoutAddr1').value = sel.getAttribute('data-addr1') || '';
        document.getElementById('checkoutAddr2').value = sel.getAttribute('data-addr2') || '';
        document.getElementById('checkoutCity').value = sel.getAttribute('data-city') || '';
        document.getElementById('checkoutState').value = sel.getAttribute('data-state') || '';
        document.getElementById('checkoutZip').value = sel.getAttribute('data-zip') || '';
        document.getElementById('checkoutCountry').value = sel.getAttribute('data-country') || 'USA';
      } else {
        document.getElementById('checkoutAddr1').value = '';
        document.getElementById('checkoutAddr2').value = '';
        document.getElementById('checkoutCity').value = '';
        document.getElementById('checkoutState').value = '';
        document.getElementById('checkoutZip').value = '';
        document.getElementById('checkoutCountry').value = 'USA';
      }
    });
  }

  const tabRegister = document.getElementById('tabRegister');
  const tabLogin = document.getElementById('tabLogin');
  if (tabRegister && tabLogin) {
    tabRegister.addEventListener('click', () => {
      isRegistering = true;
      renderCheckoutForm();
    });
    tabLogin.addEventListener('click', () => {
      isRegistering = false;
      renderCheckoutForm();
    });
  }

  const courierLabel = document.getElementById('labelCourier');
  const pickupLabel = document.getElementById('labelPickup');
  if (courierLabel && pickupLabel) {
    courierLabel.addEventListener('click', () => {
      checkoutShipping = 'COURIER';
      courierLabel.classList.add('active');
      pickupLabel.classList.remove('active');
      const addrSec = document.getElementById('checkoutShippingAddressSection');
      if (addrSec) addrSec.style.display = 'block';
      const codTitle = document.getElementById('codPaymentTitle');
      if (codTitle) codTitle.innerHTML = '💵 Cash on Delivery';
      const codRow = document.getElementById('labelPaymentCOD');
      if (codRow) {
        codRow.style.display = 'none';
        if (checkoutPayment === 'COD') {
          const stripeRow = document.getElementById('labelPaymentStripe');
          const zelleRow = document.getElementById('labelPaymentZelle');
          if (stripeRow) {
            stripeRow.click();
          } else if (zelleRow) {
            zelleRow.click();
          }
        }
      }
      updateCartSummary();
    });
    pickupLabel.addEventListener('click', () => {
      checkoutShipping = 'PICKUP';
      pickupLabel.classList.add('active');
      courierLabel.classList.remove('active');
      const addrSec = document.getElementById('checkoutShippingAddressSection');
      if (addrSec) addrSec.style.display = 'none';
      const codTitle = document.getElementById('codPaymentTitle');
      if (codTitle) codTitle.innerHTML = '💵 Cash on Pickup';
      const codRow = document.getElementById('labelPaymentCOD');
      if (codRow) codRow.style.display = '';
      updateCartSummary();
    });
  }

  const codLabel = document.getElementById('labelPaymentCOD');
  const stripeLabel = document.getElementById('labelPaymentStripe');
  const zelleLabel = document.getElementById('labelPaymentZelle');
  
  const updateRadioClasses = (activeLabel) => {
    [codLabel, stripeLabel, zelleLabel].forEach(l => {
      if (l) l.classList.remove('active');
    });
    if (activeLabel) activeLabel.classList.add('active');
  };

  if (codLabel) {
    codLabel.addEventListener('click', () => {
      checkoutPayment = 'COD';
      updateRadioClasses(codLabel);
      document.getElementById('stripeCardContainer').style.display = 'none';
      if (document.getElementById('zelleInstructionsContainer')) document.getElementById('zelleInstructionsContainer').style.display = 'none';
      updateCartSummary();
    });
  }
  if (stripeLabel) {
    stripeLabel.addEventListener('click', () => {
      checkoutPayment = 'ONLINE';
      updateRadioClasses(stripeLabel);
      document.getElementById('stripeCardContainer').style.display = 'block';
      if (document.getElementById('zelleInstructionsContainer')) document.getElementById('zelleInstructionsContainer').style.display = 'none';
      const labelEl = document.getElementById('stripeElementLabel');
      if (labelEl) labelEl.textContent = 'Card Details';
      mountStripeCardElement();
      updateCartSummary();
    });
  }
  if (zelleLabel) {
    zelleLabel.addEventListener('click', () => {
      checkoutPayment = 'ZELLE';
      updateRadioClasses(zelleLabel);
      document.getElementById('stripeCardContainer').style.display = 'none';
      document.getElementById('zelleInstructionsContainer').style.display = 'block';
      updateCartSummary();
    });
  }
  mountStripeCardElement();
  updateCartSummary();

  if (checkoutShipping === 'COURIER') {
    const codRow = document.getElementById('labelPaymentCOD');
    if (codRow) {
      codRow.style.display = 'none';
      if (checkoutPayment === 'COD') {
        const stripeRow = document.getElementById('labelPaymentStripe');
        const zelleRow = document.getElementById('labelPaymentZelle');
        if (stripeRow) stripeRow.click();
        else if (zelleRow) zelleRow.click();
      }
    }
  }
}

export function mountStripeCardElement() {
  if (window.stripeCardElement) {
    try {
      window.stripeCardElement.unmount();
      window.stripeCardElement.destroy();
    } catch(e) {
      console.warn('Error cleaning up stripe element:', e);
    }
    window.stripeCardElement = null;
    window.stripeElementsInstance = null;
  }

  const stripeCardElementDiv = document.getElementById('stripe-card-element');
  if (!stripeCardElementDiv) return;

  if (!window.stripeInstance) {
    if (checkoutPayment === 'ONLINE') {
      stripeCardElementDiv.innerHTML = `
        <div class="mock-stripe-elements" style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 12px; color: var(--gold-light); margin-bottom: 8px; background: rgba(212, 168, 83, 0.08); border: 1px solid rgba(212, 168, 83, 0.2); border-radius: 6px; padding: 8px 12px; line-height: 1.4; font-family: var(--font-body);">
            ⚙️ <strong>Mock Online Payment Mode Active</strong><br/>
            Backend is running in mock/offline payment mode.
          </div>
          <input type="text" class="form-input" placeholder="Payment Link" value="Mock Element" disabled style="background: rgba(255,255,255,0.03); opacity: 0.7; height: 42px;">
        </div>
      `;
    }
    return;
  }

  const subtotal = localCart.getSubtotal();
  const flatDiscount = window.catalogConfig.flatDiscount || 0;
  const catalogDiscount = flatDiscount > 0 ? subtotal * (flatDiscount / 100) : 0;
  
  const totalQty = localCart.items.reduce((sum, item) => sum + item.quantity, 0);
  const bulkDiscount = (subtotal >= 200 || totalQty >= 10) ? subtotal * 0.10 : (totalQty >= 5 ? subtotal * 0.05 : 0);
  
  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.valueType === 'PERCENTAGE') {
      promoDiscount = subtotal * (appliedPromo.value / 100);
    } else {
      promoDiscount = Math.min(subtotal, appliedPromo.value);
    }
  }
  
  const totalDiscount = Math.min(subtotal, catalogDiscount + bulkDiscount + promoDiscount);
  const subtotalAfterDiscount = subtotal - totalDiscount;
  const taxRate = window.catalogConfig.taxPercentage !== undefined ? window.catalogConfig.taxPercentage / 100 : 0.07;
  const tax = subtotalAfterDiscount * taxRate;
  
  const threshold = window.catalogConfig.freeShippingThreshold !== undefined ? window.catalogConfig.freeShippingThreshold : 100;
  const deliveryFee = window.catalogConfig.deliveryFee !== undefined ? window.catalogConfig.deliveryFee : 7.99;
  const shipping = (checkoutShipping === 'COURIER') ? (subtotalAfterDiscount >= threshold ? 0 : deliveryFee) : 0;
  const baseTotal = subtotalAfterDiscount + tax + shipping;
  const totalAmountCents = Math.round(baseTotal * 100);

  const paymentMethodTypes = ['card', 'us_bank_account'];

  window.stripeElementsInstance = window.stripeInstance.elements({
    mode: 'payment',
    amount: totalAmountCents > 0 ? totalAmountCents : 100,
    currency: 'usd',
    paymentMethodTypes: paymentMethodTypes,
    appearance: getStripeAppearance()
  });

  window.stripeCardElement = window.stripeElementsInstance.create('payment');
  window.stripeCardElement.mount('#stripe-card-element');
  
  window.stripeCardElement.on('change', (event) => {
    const displayError = document.getElementById('cardErrors');
    if (displayError) {
      if (event.error) {
        displayError.textContent = event.error.message;
      } else {
        displayError.textContent = '';
      }
    }
  });
}

export async function handleCheckoutSubmit() {
  if (isPlacingOrder) return;
  
  const cfg = window.catalogConfig;
  const payConfig = window.paymentConfig;
  
  if (!window.isFeatureEnabled('AllowPayment')) {
    checkoutPayment = 'COD';
  }
  
  const errorEl = document.getElementById('checkoutError');
  if (errorEl) errorEl.textContent = '';
  
  if (!auth.isLoggedIn()) {
    const email = document.getElementById('checkoutEmail')?.value;
    const password = document.getElementById('checkoutPassword')?.value;
    
    if (!email || !password) {
      showCheckoutError("Email and Password are required.");
      return;
    }
    
    if (isRegistering) {
      const firstName = document.getElementById('checkoutFirstName')?.value;
      const lastName = document.getElementById('checkoutLastName')?.value;
      const phone = document.getElementById('checkoutPhone')?.value;
      const termsChecked = document.getElementById('checkoutTermsCheckbox')?.checked;
      
      if (!firstName || !lastName || !phone) {
        showCheckoutError("Name and Phone are required for registration.");
        return;
      }

      if (!termsChecked) {
        showCheckoutError("You must agree to the Terms and Conditions to register.");
        return;
      }
      
      setCheckoutButtonLoading(true);
      try {
        const res = await fetch(`${cfg.apiUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName, lastName, phone, acceptedTermsVersion: 'v1.0' })
        });
        const data = await res.json();
        if (res.ok && data.data) {
          auth.setSession({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            user: { email, firstName, lastName, phone }
          });
        } else {
          showCheckoutError(data.message || "Registration failed.");
          setCheckoutButtonLoading(false);
          return;
        }
      } catch (e) {
        showCheckoutError("Failed to connect to authentication server.");
        setCheckoutButtonLoading(false);
        return;
      }
    } else {
      setCheckoutButtonLoading(true);
      try {
        const res = await fetch(`${cfg.apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.data) {
          const profileRes = await fetch(`${cfg.apiUrl}/user-profile`, {
            headers: { 'Authorization': `Bearer ${data.data.accessToken}` }
          });
          let userObj = { email };
          if (profileRes.ok) {
            const pData = await profileRes.json();
            userObj = pData.data || userObj;
          }
          auth.setSession({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            user: userObj
          });
        } else {
          showCheckoutError(data.message || "Login failed.");
          setCheckoutButtonLoading(false);
          return;
        }
      } catch (e) {
        showCheckoutError("Failed to connect to authentication server.");
        setCheckoutButtonLoading(false);
        return;
      }
    }
  }
  
  setCheckoutButtonLoading(true);
  await syncCartWithBackend();
  
  const savedAddrSel = document.getElementById('savedAddressSelect');
  const selectedSavedId = savedAddrSel ? savedAddrSel.value : null;

  const addressLine1 = document.getElementById('checkoutAddr1')?.value;
  const addressLine2 = document.getElementById('checkoutAddr2')?.value;
  const city = document.getElementById('checkoutCity')?.value;
  const state = document.getElementById('checkoutState')?.value;
  const zipCode = document.getElementById('checkoutZip')?.value;
  const country = document.getElementById('checkoutCountry')?.value || 'USA';
  
  if (!addressLine1 || !city || !state || !zipCode) {
    showCheckoutError("Address, City, State and PIN are required.");
    setCheckoutButtonLoading(false);
    return;
  }
  
  let addressId = selectedSavedId || null;
  if (!addressId) {
    try {
      const res = await apiCall('/addresses', {
        method: 'POST',
        body: JSON.stringify({ addressLine1, addressLine2, city, state, zipCode, country })
      });
      const data = await res.json();
      if (res.ok && data.data) {
        addressId = data.data.id;
      } else {
        showCheckoutError(data.message || "Failed to save shipping address.");
        setCheckoutButtonLoading(false);
        return;
      }
    } catch (e) {
      showCheckoutError("Failed to submit address details.");
      setCheckoutButtonLoading(false);
      return;
    }
  }
  
  if (checkoutPayment === 'ONLINE' && window.stripeElementsInstance) {
    const { error: submitError } = await window.stripeElementsInstance.submit();
    if (submitError) {
      showCheckoutError(submitError.message);
      setCheckoutButtonLoading(false);
      return;
    }
  }

  const notes = document.getElementById('checkoutNotes')?.value;
  let orderResult = null;
  try {
    const res = await apiCall('/orders', {
      method: 'POST',
      body: JSON.stringify({
        addressId,
        notes,
        shippingMethod: checkoutShipping,
        paymentMethod: checkoutPayment,
        promoCode: appliedPromo ? appliedPromo.code : null,
        acceptedTermsVersion: 'v1.0'
      })
    });
    const data = await res.json();
    if (res.ok && data.data) {
      orderResult = data.data;
    } else {
      showCheckoutError(data.message || "Failed to place order.");
      setCheckoutButtonLoading(false);
      return;
    }
  } catch (e) {
    showCheckoutError("Failed to place order on server.");
    setCheckoutButtonLoading(false);
    return;
  }
  
  if (checkoutPayment === 'ONLINE' && window.stripeInstance) {
    try {
      const piRes = await apiCall(`/orders/${orderResult.id}/payment-intent`, {
        method: 'POST'
      });
      const piData = await piRes.json();
      if (piRes.ok && piData.data) {
        const { clientSecret } = piData.data;
        const result = await window.stripeInstance.confirmPayment({
          elements: window.stripeElementsInstance,
          clientSecret,
          confirmParams: {
            return_url: window.location.href + '?success=true&orderId=' + orderResult.id,
            payment_method_data: {
              billing_details: {
                name: `${auth.user?.firstName} ${auth.user?.lastName}`,
                email: auth.user?.email,
                phone: auth.user?.phone
              }
            }
          },
          redirect: 'if_required'
        });
        
        if (result.error) {
          showCheckoutError(`Payment Failed: ${result.error.message}. Please retry.`);
          setCheckoutButtonLoading(false);
          return;
        }
      } else {
        showCheckoutError(piData.message || "Failed to initialize payment transaction.");
        setCheckoutButtonLoading(false);
        return;
      }
    } catch (e) {
      showCheckoutError("Error processing payment via Stripe.");
      setCheckoutButtonLoading(false);
      return;
    }
  }
  
  localStorage.setItem('mb_lastOrder', JSON.stringify(orderResult));
  localCart.clear();
  appliedPromo = null;
  window.stripeCardElement = null;
  window.stripeElementsInstance = null;
  activeTab = 'success';
  setCheckoutButtonLoading(false);
  renderCart();
}

export function showCheckoutError(msg) {
  const err = document.getElementById('checkoutError');
  if (err) err.textContent = msg;
}

export function setCheckoutButtonLoading(isLoading) {
  isPlacingOrder = isLoading;
  const btn = document.getElementById('cartActionBtn');
  if (btn) {
    btn.disabled = isLoading;
    btn.innerHTML = isLoading ? '<div class="loader-spinner" style="width: 20px; height: 20px; border-width: 2.5px;"></div> Processing...' : (activeTab === 'checkout' ? 'Place Order' : 'Proceed to Checkout');
  }
}

export function renderSuccessScreen() {
  const body = document.getElementById('cartBody');
  const lastOrder = JSON.parse(localStorage.getItem('mb_lastOrder') || 'null');
  const cfg = window.catalogConfig;
  
  if (!lastOrder) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <h3>Order Placed!</h3>
        <p>Thank you for your purchase. We are preparing your order.</p>
      </div>
    `;
    return;
  }
  
  body.innerHTML = `
    <div class="empty-state" style="padding: 40px 12px; text-align: center;">
      <div class="empty-icon" style="color: var(--gold); font-size: 56px; margin-bottom: 16px;">✓</div>
      <h3 style="font-size: 22px; font-family: var(--font-display); color: white; margin-bottom: 8px;">Order Confirmed!</h3>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">Thank you for shopping with Mayil blooms.</p>
      
      ${!window.isFeatureEnabled('AllowPayment') ? `
        <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid var(--gold); border-radius: 8px; padding: 12px; color: var(--gold-light); font-size: 13px; text-align: center; margin: 16px 0; line-height: 1.4; border-style: dashed;">
          Our support team will contact you for further details.
        </div>
      ` : ''}

      <div class="order-history-card" style="text-align: left; background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass);">
        <div class="summary-row" style="margin-bottom: 8px;">
          <span>Order Number:</span>
          <strong style="color: var(--gold-light);">${lastOrder.orderNumber}</strong>
        </div>
        ${lastOrder.paymentFee > 0 ? `
        <div class="summary-row" style="margin-bottom: 8px;">
          <span>Processing Fee:</span>
          <strong>${cfg.currency}${lastOrder.paymentFee.toFixed(2)}</strong>
        </div>
        ` : ''}
        <div class="summary-row" style="margin-bottom: 8px;">
          <span>Total Amount:</span>
          <strong>${cfg.currency}${lastOrder.total.toFixed(2)}</strong>
        </div>
        <div class="summary-row" style="margin-bottom: 8px;">
          <span>Payment Method:</span>
          <strong>${window.isFeatureEnabled('AllowPayment') ? (lastOrder.paymentMethod === 'COD' ? (lastOrder.shippingMethod === 'PICKUP' ? 'Cash on Pickup' : 'Cash on Delivery') : (lastOrder.paymentMethod === 'ONLINE' ? 'Stripe Online' : 'Credit Card')) : 'Support Contact'}</strong>
        </div>
        <div class="summary-row" style="margin-bottom: 8px;">
          <span>Shipping Address:</span>
          <span style="font-size: 12px; color: var(--text-secondary); text-align: right; max-width: 60%;">${lastOrder.shippingAddress.addressLine1}, ${lastOrder.shippingAddress.city}</span>
        </div>
      </div>
      
      <button class="checkout-btn" id="successCloseBtn" style="margin-top: 32px;">Continue Shopping</button>
    </div>
  `;
  
  document.getElementById('successCloseBtn').addEventListener('click', () => {
    document.getElementById('cartDrawer').classList.remove('active');
    document.getElementById('cartOverlay').classList.remove('active');
    activeTab = 'cart';
  });
}

export function placeOrderViaWhatsApp() {
  const cfg = window.catalogConfig;
  const contact = cfg.contactDetails || {};
  if (!contact.whatsapp) {
    alert("WhatsApp ordering is currently unavailable. Please contact us via email.");
    return;
  }
  
  let message = `*NEW ORDER - Mayil blooms Catalog*\n\n`;
  localCart.items.forEach((item, idx) => {
    message += `${idx + 1}. *${item.name}* (Qty: ${item.quantity}) - ${cfg.currency}${item.price}\n`;
  });
  
  const subtotal = localCart.getSubtotal();
  const flatDiscount = cfg.flatDiscount || 0;
  let discount = subtotal * (flatDiscount / 100);
  const total = subtotal - discount + 10;
  
  message += `\n*Subtotal:* ${cfg.currency}${subtotal.toFixed(2)}`;
  if (flatDiscount > 0) message += `\n*Discount (${flatDiscount}%):* -${cfg.currency}${discount.toFixed(2)}`;
  message += `\n*Estimated Delivery:* ${cfg.currency}10.00`;
  message += `\n*Estimated Total:* ${cfg.currency}${total.toFixed(2)}\n\n`;
  message += `Please confirm my order and send the payment instructions. Thanks!`;
  
  const waLink = `https://wa.me/${contact.whatsapp.replace(/[^+\d]/g, '')}?text=${encodeURIComponent(message)}`;
  window.open(waLink, '_blank');
  localCart.clear();
  document.getElementById('cartDrawer').classList.remove('active');
  document.getElementById('cartOverlay').classList.remove('active');
  alert("Order summary sent to WhatsApp. Please complete the messaging steps to finalize your order!");
}

window.autoApplyPromo = function(code) {
  const input = document.getElementById('promoCodeInput');
  if (input) {
    input.value = code;
    const btn = document.getElementById('applyPromoBtn');
    if (btn) btn.click();
  }
};

window.autoApplyModalPromo = function(code) {
  const input = document.getElementById('modalPromoInput');
  if (input) {
    input.value = code;
    const btn = document.getElementById('modalApplyPromoBtn');
    if (btn) btn.click();
  }
};

document.addEventListener('mb-theme-change', () => {
  if (checkoutPayment === 'ONLINE' && document.getElementById('stripe-card-element')) {
    mountStripeCardElement();
  }
});
