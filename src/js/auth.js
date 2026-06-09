/**
 * Session, Authentication, and Customer Profile Module
 */

export const auth = {
  accessToken: localStorage.getItem('mb_accessToken'),
  refreshToken: localStorage.getItem('mb_refreshToken'),
  user: JSON.parse(localStorage.getItem('mb_user') || 'null'),
  
  setSession(data) {
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.user = data.user || null;
    localStorage.setItem('mb_accessToken', data.accessToken);
    localStorage.setItem('mb_refreshToken', data.refreshToken);
    localStorage.setItem('mb_user', JSON.stringify(data.user));
    updateAuthUI();
  },
  
  clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    localStorage.removeItem('mb_accessToken');
    localStorage.removeItem('mb_refreshToken');
    localStorage.removeItem('mb_user');
    updateAuthUI();
  },
  
  isLoggedIn() {
    return !!this.accessToken;
  }
};

export async function apiCall(endpoint, options = {}) {
  const cfg = window.catalogConfig;
  const url = `${cfg.apiUrl}${endpoint}`;
  options.headers = options.headers || {};
  options.headers['Content-Type'] = 'application/json';
  
  if (auth.accessToken) {
    options.headers['Authorization'] = `Bearer ${auth.accessToken}`;
  }
  
  let response = await fetch(url, options);
  
  if (response.status === 401 && auth.refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      options.headers['Authorization'] = `Bearer ${auth.accessToken}`;
      response = await fetch(url, options);
    }
  }
  
  return response;
}

export async function refreshAccessToken() {
  const cfg = window.catalogConfig;
  try {
    const res = await fetch(`${cfg.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken })
    });
    if (res.ok) {
      const result = await res.json();
      if (result.data?.accessToken) {
        auth.setSession({
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken || auth.refreshToken,
          user: auth.user
        });
        return true;
      }
    }
  } catch (e) {
    console.error('Error refreshing token:', e);
  }
  return false;
}

export function updateAuthUI() {
  const trackBtn = document.getElementById('trackOrdersBtn');
  const sideTrackBtn = document.getElementById('sideTrackOrdersBtn');
  
  if (auth.isLoggedIn()) {
    if (trackBtn) trackBtn.style.display = 'block';
    if (sideTrackBtn) sideTrackBtn.style.display = 'block';
  } else {
    if (trackBtn) trackBtn.style.display = 'none';
    if (sideTrackBtn) sideTrackBtn.style.display = 'none';
  }
  
  updateProfileIcon();
  loadOffers();
  loadNotifications();
}

export function updateProfileIcon() {
  const btn = document.getElementById('profileBtn');
  const avatar = document.getElementById('profileAvatar');
  if (!btn || !avatar) return;

  if (auth.isLoggedIn() && auth.user) {
    btn.classList.add('logged-in');
    const fn = auth.user.firstName || '';
    const ln = auth.user.lastName || '';
    const initials = (fn.charAt(0) + ln.charAt(0)).toUpperCase() || '?';
    avatar.textContent = initials;
  } else {
    btn.classList.remove('logged-in');
    avatar.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`;
  }
}

export let savedAddresses = [];

export async function fetchSavedAddresses() {
  if (!auth.isLoggedIn()) { savedAddresses = []; return; }
  try {
    const res = await apiCall('/addresses');
    if (res.ok) {
      const data = await res.json();
      savedAddresses = data.data || [];
    }
  } catch (e) {
    savedAddresses = [];
  }
}

export async function loadOffers() {
  const container = document.getElementById('offersGridContainer');
  if (!container) return;

  const cfg = window.catalogConfig;
  let discounts = [];
  let isFirstTime = true;

  if (auth.isLoggedIn()) {
    try {
      const res = await apiCall('/orders?page=0&size=50');
      if (res.ok) {
        const data = await res.json();
        const orders = data.data?.content || [];
        const successfulOrders = orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'FAILED');
        if (successfulOrders.length > 0) {
          isFirstTime = false;
        }
      }
    } catch (e) {
      console.warn("Failed to check first-time buyer status", e);
    }

    try {
      const res = await apiCall('/discounts/my-discounts');
      if (res.ok) {
        const data = await res.json();
        discounts = data.data || [];
      }
    } catch (e) {
      console.warn("Failed to fetch user discounts", e);
    }
  }

  if (discounts.length === 0) {
    try {
      const res = await fetch(`${cfg.apiUrl}/discounts/active`);
      if (res.ok) {
        const data = await res.json();
        discounts = data.data || [];
      }
    } catch (e) {
      console.warn("Failed to fetch active discounts", e);
    }
  }

  let offersHTML = '';
  const hasFirstCode = discounts.some(d => d.code.toUpperCase() === 'FIRST');

  if (isFirstTime && !hasFirstCode) {
    offersHTML += `
      <div class="offer-card">
        <div class="offer-card-header">
          <span class="offer-card-badge accent">First-Time Buyer</span>
          <span style="font-size: 18px;">🎁</span>
        </div>
        <div>
          <div class="offer-card-value">5% OFF</div>
          <div class="offer-card-title">Welcome Offer</div>
          <p class="offer-card-desc">Welcome to Mayil blooms! Get a special 5% discount on your very first purchase.</p>
        </div>
        <div class="offer-card-footer">
          <div class="offer-card-code-container">
            <span class="offer-card-code">FIRST</span>
            <button class="offer-card-copy-btn" onclick="copyOfferCode(this, 'FIRST')" aria-label="Copy code">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
          </div>
          <button class="offer-card-action-btn" onclick="applyOfferCode('FIRST')">Apply Offer</button>
        </div>
      </div>
    `;
  }

  discounts.forEach(discount => {
    if (!isFirstTime && discount.code.toUpperCase() === 'FIRST') {
      return;
    }

    const isPercentage = discount.valueType === 'PERCENTAGE';
    const valText = isPercentage ? `${discount.value}% OFF` : `${cfg.currency}${discount.value} OFF`;
    const minText = discount.minPurchaseAmount ? `Min Purchase: ${cfg.currency}${discount.minPurchaseAmount}` : 'No minimum purchase';
    
    let badgeType = 'info';
    let badgeText = 'Promotion';
    if (discount.code.toUpperCase() === 'FIRST') {
      badgeType = 'accent';
      badgeText = 'First Order';
    } else if (discount.customerId) {
      badgeType = 'accent';
      badgeText = 'Exclusive For You';
    } else if (discount.discountType === 'CATEGORY_SPECIFIC') {
      badgeText = `${discount.categoryName || 'Category'} Sale`;
    }

    offersHTML += `
      <div class="offer-card">
        <div class="offer-card-header">
          <span class="offer-card-badge ${badgeType}">${badgeText}</span>
          <span style="font-size: 18px;">🏷️</span>
        </div>
        <div>
          <div class="offer-card-value">${valText}</div>
          <div class="offer-card-title">${discount.name}</div>
          <p class="offer-card-desc">${discount.description || `Save on your order. ${minText}.`}</p>
        </div>
        <div class="offer-card-footer">
          <div class="offer-card-code-container">
            <span class="offer-card-code">${discount.code}</span>
            <button class="offer-card-copy-btn" onclick="copyOfferCode(this, '${discount.code}')" aria-label="Copy code">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
          </div>
          <button class="offer-card-action-btn" onclick="applyOfferCode('${discount.code}')">Apply Offer</button>
        </div>
      </div>
    `;
  });

  offersHTML += `
    <div class="offer-card">
      <div class="offer-card-header">
        <span class="offer-card-badge">Free Delivery</span>
        <span style="font-size: 18px;">🚚</span>
      </div>
      <div>
        <div class="offer-card-value">FREE SHIPPING</div>
        <div class="offer-card-title">Orders over $100</div>
        <p class="offer-card-desc">No coupon code required! Add items totaling $100 or more to your cart, and the shipping fee drops to $0.00 automatically.</p>
      </div>
      <div class="offer-card-footer" style="margin-top: auto;">
        <button class="offer-card-action-btn" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--border-glass);" onclick="scrollToProducts()">Shop Collection</button>
      </div>
    </div>
  `;

  offersHTML += `
    <div class="offer-card">
      <div class="offer-card-header">
        <span class="offer-card-badge">Bulk Savings</span>
        <span style="font-size: 18px;">📦</span>
      </div>
      <div>
        <div class="offer-card-value">Up to 10% OFF</div>
        <div class="offer-card-title">Volume Discounts</div>
        <p class="offer-card-desc">Save automatically when ordering garlands and hair crafts in bulk: Get 5% off for 5+ items, or 10% off for 10+ items or orders above $200!</p>
      </div>
      <div class="offer-card-footer" style="margin-top: auto;">
        <button class="offer-card-action-btn" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--border-glass);" onclick="scrollToProducts()">Shop Bulk</button>
      </div>
    </div>
  `;

  container.innerHTML = offersHTML;
}

export async function loadNotifications() {
  const cfg = window.catalogConfig;
  try {
    const res = await apiCall('/banners/active');
    if (!res.ok) return;
    const data = await res.json();
    const banners = data.data || [];

    const topContainer = document.getElementById('topNotificationContainer');
    const bottomContainer = document.getElementById('bottomNotificationContainer');
    const popupModal = document.getElementById('bannerPopupModal');
    const popupContent = document.getElementById('bannerPopupContent');

    if (topContainer) topContainer.innerHTML = '';
    if (bottomContainer) bottomContainer.innerHTML = '';

    banners.forEach(banner => {
      const dismissedKey = `mb_dismissed_banner_${banner.id}`;
      if (localStorage.getItem(dismissedKey)) return;

      const bg = banner.backgroundColor || '#D4A853';
      const fg = banner.textColor || '#060608';
      const actionBtnHtml = (banner.actionText && banner.actionUrl) 
        ? `<a href="${banner.actionUrl}" class="notification-banner-btn" style="color: ${fg}; font-weight: bold;">${banner.actionText}</a>` 
        : '';
      const canDismiss = banner.dismissType !== 'PERSISTENT';
      const closeBtnHtml = canDismiss 
        ? `<button class="notification-banner-close" aria-label="Dismiss">&times;</button>` 
        : '';

      if (banner.position === 'TOP') {
        const bannerEl = document.createElement('div');
        bannerEl.className = 'notification-banner-top';
        bannerEl.style.backgroundColor = bg;
        bannerEl.style.color = fg;
        bannerEl.id = `banner-top-${banner.id}`;
        
        bannerEl.innerHTML = `
          <div class="notification-banner-content">
            <strong>${banner.title}:</strong> ${banner.message} ${actionBtnHtml}
          </div>
          ${closeBtnHtml}
        `;

        topContainer.appendChild(bannerEl);
        document.body.classList.add('has-top-banner');

        const updateHeight = () => {
          const rect = bannerEl.getBoundingClientRect();
          document.documentElement.style.setProperty('--top-banner-height', `${rect.height}px`);
        };
        setTimeout(updateHeight, 100);
        window.addEventListener('resize', updateHeight);

        if (canDismiss) {
          bannerEl.querySelector('.notification-banner-close').addEventListener('click', () => {
            bannerEl.style.transform = 'translateY(-100%)';
            bannerEl.style.transition = 'transform 0.3s ease';
            localStorage.setItem(dismissedKey, 'true');
            setTimeout(() => {
              bannerEl.remove();
              if (topContainer.children.length === 0) {
                document.body.classList.remove('has-top-banner');
                document.documentElement.style.removeProperty('--top-banner-height');
              }
            }, 300);
          });
        }

        if ((banner.dismissType === 'AUTO_DISMISS' || banner.dismissType === 'BOTH') && banner.autoDismissSeconds) {
          setTimeout(() => {
            const btn = bannerEl.querySelector('.notification-banner-close');
            if (btn) btn.click();
          }, banner.autoDismissSeconds * 1000);
        }
      } 
      else if (banner.position === 'BOTTOM') {
        const toastEl = document.createElement('div');
        toastEl.className = 'notification-toast-bottom';
        toastEl.style.borderLeft = `4px solid ${bg}`;
        toastEl.id = `banner-bottom-${banner.id}`;

        const btnHtml = (banner.actionText && banner.actionUrl) 
          ? `<a href="${banner.actionUrl}" class="btn btn-secondary" style="align-self: flex-start; margin-top: 8px; font-size: 11px; padding: 6px 14px; background: ${bg}; color: ${fg}; border: none;">${banner.actionText}</a>` 
          : '';
        const closeToastHtml = canDismiss 
          ? `<button class="notification-toast-close" aria-label="Close">&times;</button>` 
          : '';

        toastEl.innerHTML = `
          <div class="notification-toast-title" style="color: ${bg};">${banner.title}</div>
          <div class="notification-toast-msg">${banner.message}</div>
          ${btnHtml}
          ${closeToastHtml}
        `;

        bottomContainer.appendChild(toastEl);

        if (canDismiss) {
          toastEl.querySelector('.notification-toast-close').addEventListener('click', () => {
            toastEl.style.transform = 'translateX(120%)';
            toastEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            toastEl.style.opacity = '0';
            localStorage.setItem(dismissedKey, 'true');
            setTimeout(() => toastEl.remove(), 300);
          });
        }

        if ((banner.dismissType === 'AUTO_DISMISS' || banner.dismissType === 'BOTH') && banner.autoDismissSeconds) {
          setTimeout(() => {
            const btn = toastEl.querySelector('.notification-toast-close');
            if (btn) btn.click();
          }, banner.autoDismissSeconds * 1000);
        }
      } 
      else if (banner.position === 'MODAL' && popupModal && popupContent) {
        const modalDismissedKey = `mb_dismissed_modal_${banner.id}`;
        if (localStorage.getItem(modalDismissedKey)) return;

        const imageHtml = banner.imageUrl 
          ? `<img src="${banner.imageUrl}" alt="${banner.title}" style="width: 100%; height: 200px; object-fit: cover; border-top-left-radius: var(--radius-sm); border-top-right-radius: var(--radius-sm); margin-bottom: 16px;">` 
          : '';
        const actionBtn = (banner.actionText && banner.actionUrl) 
          ? `<a href="${banner.actionUrl}" class="checkout-btn" style="background: ${bg}; color: ${fg}; display: block; text-align: center; text-decoration: none; margin-top: 24px; font-weight: 700; width: 100%; border: none;">${banner.actionText}</a>` 
          : '';
        const closeBtn = canDismiss 
          ? `<button class="modal-close banner-modal-close" style="position: absolute; right: 16px; top: 16px; background: none; border: none; color: var(--text-secondary); font-size: 20px; cursor: pointer; z-index: 10;">&times;</button>` 
          : '';

        popupContent.innerHTML = `
          ${closeBtn}
          ${imageHtml}
          <div style="padding: 24px; text-align: center;">
            <h3 style="font-family: var(--font-display); font-size: 24px; color: white; margin-bottom: 12px; font-weight: 800;">${banner.title}</h3>
            <div style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;">${banner.message}</div>
            ${actionBtn}
          </div>
        `;

        popupModal.classList.add('active');

        const dismissModal = () => {
          popupModal.classList.remove('active');
          localStorage.setItem(modalDismissedKey, 'true');
        };

        if (canDismiss) {
          popupContent.querySelector('.banner-modal-close').addEventListener('click', dismissModal);
          popupModal.addEventListener('click', (e) => {
            if (e.target === popupModal) dismissModal();
          });
        }

        if ((banner.dismissType === 'AUTO_DISMISS' || banner.dismissType === 'BOTH') && banner.autoDismissSeconds) {
          setTimeout(dismissModal, banner.autoDismissSeconds * 1000);
        }
      }
    });
  } catch (e) {
    console.error("Failed to load notifications", e);
  }
}

export function openAccountModal(tab = 'profile') {
  const modal = document.getElementById('accountModal');
  if (!modal) return;
  modal.classList.add('active');

  if (auth.isLoggedIn() && auth.user) {
    const fn = auth.user.firstName || '';
    const ln = auth.user.lastName || '';
    const initials = (fn.charAt(0) + ln.charAt(0)).toUpperCase() || '?';
    document.getElementById('accountAvatarLarge').textContent = initials;
    document.getElementById('accountModalTitle').textContent = `${fn} ${ln}`.trim() || 'My Account';
    document.getElementById('accountModalEmail').textContent = auth.user.email || '';
  } else {
    document.getElementById('accountAvatarLarge').textContent = '?';
    document.getElementById('accountModalTitle').textContent = 'Sign in to continue';
    document.getElementById('accountModalEmail').textContent = '';
  }

  switchAccountTab(tab);
}

export function switchAccountTab(tab) {
  document.querySelectorAll('.account-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });

  if (!auth.isLoggedIn()) {
    renderAccountSignInPrompt();
    return;
  }

  if (tab === 'profile') renderAccountProfile();
  else if (tab === 'addresses') renderAccountAddresses();
  else if (tab === 'orders') renderAccountOrders();
}

export function renderAccountSignInPrompt() {
  const body = document.getElementById('accountTabBody');
  if (!body) return;
  let isSignInMode = false;

  function renderAuthForm() {
    body.innerHTML = `
      <div class="account-auth-form">
        <div class="checkout-tabs">
          <button class="checkout-tab ${!isSignInMode ? 'active' : ''}" id="modalTabRegister">Create Account</button>
          <button class="checkout-tab ${isSignInMode ? 'active' : ''}" id="modalTabLogin">Sign In</button>
        </div>

        <div style="margin-top: 20px;">
          ${!isSignInMode ? `
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">First Name</label>
                <input type="text" class="form-input" id="modalFirstName" placeholder="John">
              </div>
              <div class="form-group">
                <label class="form-label">Last Name</label>
                <input type="text" class="form-input" id="modalLastName" placeholder="Doe">
              </div>
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label">Phone Number</label>
              <input type="tel" class="form-input" id="modalPhone" placeholder="+1 (555) 000-0000">
            </div>
          ` : ''}

          <div class="form-group" style="margin-top: 12px;">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-input" id="modalEmail" placeholder="john.doe@example.com">
          </div>

          <div class="form-group" style="margin-top: 12px;">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="modalPassword" placeholder="••••••••">
          </div>

          ${!isSignInMode ? `
          <div class="form-group" style="margin-top: 12px; display: flex; align-items: flex-start; gap: 8px;">
            <input type="checkbox" id="modalTermsCheckbox" style="margin-top: 3px; cursor: pointer;">
            <label for="modalTermsCheckbox" style="font-size: 13px; color: var(--text-secondary); cursor: pointer; line-height: 1.4;">
              I agree to the <a href="#" id="modalTermsLink" style="color: var(--gold-light); text-decoration: underline;">Terms and Conditions</a> (Version 1.0)
            </label>
          </div>
          ` : ''}

          <div id="modalAuthError" class="payment-errors" style="margin-top: 10px; text-align: center; font-size: 13px; min-height: 18px;"></div>

          <button class="checkout-btn" id="modalAuthSubmitBtn" style="margin-top: 16px;">
            ${isSignInMode ? 'Sign In' : 'Create Account'}
          </button>
          
          ${isSignInMode ? `
          <div style="text-align: center; margin-top: 12px;">
            <a href="#" id="forgotPasswordBtn" style="color: var(--text-secondary); text-decoration: none; font-size: 13px;">Forgot Password?</a>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    document.getElementById('modalTabRegister').addEventListener('click', () => {
      isSignInMode = false;
      renderAuthForm();
    });
    document.getElementById('modalTabLogin').addEventListener('click', () => {
      isSignInMode = true;
      renderAuthForm();
    });

    document.getElementById('modalAuthSubmitBtn').addEventListener('click', async () => {
      const btn = document.getElementById('modalAuthSubmitBtn');
      const errEl = document.getElementById('modalAuthError');
      errEl.textContent = '';

      const email = document.getElementById('modalEmail')?.value?.trim();
      const password = document.getElementById('modalPassword')?.value;

      if (!email || !password) {
        errEl.textContent = 'Email and password are required.';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<div class="loader-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;"></div> Processing...';

      try {
        const cfg = window.catalogConfig;
        if (isSignInMode) {
          const res = await fetch(`${cfg.apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (res.ok && data.data) {
            let userObj = { email };
            try {
              const profileRes = await fetch(`${cfg.apiUrl}/user-profile`, {
                headers: { 'Authorization': `Bearer ${data.data.accessToken}` }
              });
              if (profileRes.ok) {
                const pData = await profileRes.json();
                userObj = pData.data || userObj;
              }
            } catch (e) {}

            auth.setSession({
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
              user: userObj
            });

            openAccountModal('profile');
            return;
          } else {
            errEl.textContent = data.message || 'Invalid email or password.';
          }
        } else {
          const firstName = document.getElementById('modalFirstName')?.value?.trim();
          const lastName = document.getElementById('modalLastName')?.value?.trim();
          const phone = document.getElementById('modalPhone')?.value?.trim();
          const termsChecked = document.getElementById('modalTermsCheckbox')?.checked;

          if (!firstName || !lastName || !phone) {
            errEl.textContent = 'All fields are required.';
            btn.disabled = false;
            btn.textContent = 'Create Account';
            return;
          }

          if (!termsChecked) {
            errEl.textContent = 'You must agree to the Terms and Conditions.';
            btn.disabled = false;
            btn.textContent = 'Create Account';
            return;
          }

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

            openAccountModal('profile');
            return;
          } else {
            errEl.textContent = data.message || 'Registration failed. Try a different email.';
          }
        }
      } catch (e) {
        errEl.textContent = 'Cannot connect to the server. Please try again later.';
      }

      btn.disabled = false;
      btn.textContent = isSignInMode ? 'Sign In' : 'Create Account';
    });

    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', (e) => {
        e.preventDefault();
        renderForgotPasswordForm();
      });
    }
  }

  function renderForgotPasswordForm() {
    let step = 1;
    let userEmail = '';

    function drawForm() {
      const cfg = window.catalogConfig;
      if (step === 1) {
        body.innerHTML = `
          <div class="account-auth-form">
            <div style="text-align: center; margin-bottom: 20px;">
              <h3 style="font-family: var(--font-display); font-size: 22px; color: white;">Reset Password</h3>
              <p style="color: var(--text-secondary); font-size: 14px; margin-top: 8px;">Enter your email to receive a password reset code.</p>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-input" id="forgotEmail" placeholder="john.doe@example.com">
            </div>

            <div id="forgotAuthError" class="payment-errors" style="margin-top: 10px; text-align: center; font-size: 13px; min-height: 18px;"></div>
            <div id="forgotAuthSuccess" style="color: #50c850; margin-top: 10px; text-align: center; font-size: 13px; min-height: 18px;"></div>

            <button class="checkout-btn" id="forgotSubmitBtn" style="margin-top: 16px;">
              Send Code
            </button>
            
            <div style="text-align: center; margin-top: 16px;">
              <a href="#" id="backToLoginBtn" style="color: var(--gold); text-decoration: none; font-size: 14px; font-weight: 500;">← Back to Sign In</a>
            </div>
          </div>
        `;

        document.getElementById('backToLoginBtn').addEventListener('click', (e) => {
          e.preventDefault();
          renderAuthForm();
        });

        document.getElementById('forgotSubmitBtn').addEventListener('click', async () => {
          const btn = document.getElementById('forgotSubmitBtn');
          const errEl = document.getElementById('forgotAuthError');
          errEl.textContent = '';

          const email = document.getElementById('forgotEmail')?.value?.trim();
          if (!email) {
            errEl.textContent = 'Email is required.';
            return;
          }

          btn.disabled = true;
          btn.innerHTML = '<div class="loader-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;"></div> Sending...';

          try {
            const res = await fetch(`${cfg.apiUrl}/auth/forgot-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email })
            });
            const data = await res.json();
            if (res.ok) {
              userEmail = email;
              step = 2;
              drawForm();
            } else {
              errEl.textContent = data.message || 'Failed to send reset code.';
              btn.disabled = false;
              btn.textContent = 'Send Code';
            }
          } catch (e) {
            errEl.textContent = 'Cannot connect to the server.';
            btn.disabled = false;
            btn.textContent = 'Send Code';
          }
        });
      } else if (step === 2) {
        body.innerHTML = `
          <div class="account-auth-form">
            <div style="text-align: center; margin-bottom: 20px;">
              <h3 style="font-family: var(--font-display); font-size: 22px; color: white;">Verify Code</h3>
              <p style="color: var(--text-secondary); font-size: 14px; margin-top: 8px;">Enter the 4-digit code sent to ${userEmail} and your new password.</p>
            </div>

            <div class="form-group">
              <label class="form-label">Verification Code (e.g. 5433)</label>
              <input type="text" class="form-input" id="forgotCode" placeholder="Enter code" maxlength="6" style="text-align: center; letter-spacing: 2px; font-weight: bold; font-size: 18px;">
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label">New Password</label>
              <input type="password" class="form-input" id="forgotNewPassword" placeholder="••••••••">
            </div>

            <div id="forgotAuthError" class="payment-errors" style="margin-top: 10px; text-align: center; font-size: 13px; min-height: 18px;"></div>
            <div id="forgotAuthSuccess" style="color: #50c850; margin-top: 10px; text-align: center; font-size: 13px; min-height: 18px;"></div>

            <button class="checkout-btn" id="forgotSubmitBtn" style="margin-top: 16px;">
              Reset Password
            </button>
            
            <div style="text-align: center; margin-top: 16px;">
              <a href="#" id="backToStep1Btn" style="color: var(--text-secondary); text-decoration: none; font-size: 14px;">← Request a new code</a>
            </div>
          </div>
        `;

        document.getElementById('backToStep1Btn').addEventListener('click', (e) => {
          e.preventDefault();
          step = 1;
          drawForm();
        });

        document.getElementById('forgotSubmitBtn').addEventListener('click', async () => {
          const btn = document.getElementById('forgotSubmitBtn');
          const errEl = document.getElementById('forgotAuthError');
          const succEl = document.getElementById('forgotAuthSuccess');
          errEl.textContent = '';
          succEl.textContent = '';

          const code = document.getElementById('forgotCode')?.value?.trim();
          const newPassword = document.getElementById('forgotNewPassword')?.value;

          if (!code || !newPassword) {
            errEl.textContent = 'All fields are required.';
            return;
          }

          btn.disabled = true;
          btn.innerHTML = '<div class="loader-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;"></div> Resetting...';

          try {
            const res = await fetch(`${cfg.apiUrl}/auth/reset-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: code, newPassword: newPassword })
            });
            const data = await res.json();
            if (res.ok) {
              succEl.textContent = 'Password reset successful! Redirecting to sign in...';
              setTimeout(() => {
                renderAuthForm();
              }, 2000);
            } else {
              errEl.textContent = data.message || 'Invalid code or password reset failed.';
              btn.disabled = false;
              btn.textContent = 'Reset Password';
            }
          } catch (e) {
            errEl.textContent = 'Cannot connect to the server.';
            btn.disabled = false;
            btn.textContent = 'Reset Password';
          }
        });
      }
    }

    drawForm();
  }

  renderAuthForm();
}

export async function renderAccountProfile() {
  const body = document.getElementById('accountTabBody');
  if (!body) return;
  body.innerHTML = `<div class="loader-container"><div class="loader-spinner"></div></div>`;

  let profile = auth.user || {};
  try {
    const res = await apiCall('/profile');
    if (res.ok) {
      const data = await res.json();
      profile = data.data || profile;
    }
  } catch (e) {}

  body.innerHTML = `
    <div class="profile-form-grid">
      <div class="form-group">
        <label class="form-label">First Name</label>
        <input type="text" class="form-input" id="pFirstName" value="${profile.firstName || ''}" placeholder="First Name">
      </div>
      <div class="form-group">
        <label class="form-label">Last Name</label>
        <input type="text" class="form-input" id="pLastName" value="${profile.lastName || ''}" placeholder="Last Name">
      </div>
      <div class="form-group full">
        <label class="form-label">Email Address</label>
        <input type="email" class="form-input" id="pEmail" value="${profile.email || ''}" placeholder="email@example.com" readonly style="opacity:0.6;cursor:not-allowed;">
      </div>
      <div class="form-group full">
        <label class="form-label">Phone Number</label>
        <input type="tel" class="form-input" id="pPhone" value="${profile.phone || ''}" placeholder="+1 (555) 000-0000">
      </div>
    </div>
    <div id="profileSaveMsg" style="font-size:13px;text-align:center;margin-top:8px;height:18px;"></div>
    <button class="checkout-btn profile-save-btn" id="profileSaveBtn">Save Changes</button>
    
    <div style="margin-top: 24px; text-align: center; border-top: 1px solid var(--border-glass); padding-top: 16px;">
      <button class="btn-signout" id="modalSignOutBtn">Sign Out</button>
    </div>
  `;

  document.getElementById('modalSignOutBtn').addEventListener('click', () => {
    auth.clearSession();
    document.getElementById('accountModal').classList.remove('active');
  });

  document.getElementById('profileSaveBtn').addEventListener('click', async () => {
    const btn = document.getElementById('profileSaveBtn');
    const msg = document.getElementById('profileSaveMsg');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    msg.textContent = '';

    try {
      const res = await apiCall('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: document.getElementById('pFirstName').value.trim(),
          lastName: document.getElementById('pLastName').value.trim(),
          phone: document.getElementById('pPhone').value.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.data) {
        auth.user = { ...auth.user, ...data.data };
        localStorage.setItem('mb_user', JSON.stringify(auth.user));
        updateProfileIcon();
        openAccountModal('profile');
        msg.style.color = '#50c850';
        msg.textContent = '✓ Profile updated successfully';
      } else {
        msg.style.color = '#E8384F';
        msg.textContent = data.message || 'Failed to update profile.';
      }
    } catch (e) {
      msg.style.color = '#E8384F';
      msg.textContent = 'Error saving profile.';
    }
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  });
}

export async function renderAccountAddresses() {
  const body = document.getElementById('accountTabBody');
  if (!body) return;
  body.innerHTML = `<div class="loader-container"><div class="loader-spinner"></div></div>`;

  await fetchSavedAddresses();
  renderAddressList(body);
}

export function renderAddressList(body) {
  if (savedAddresses.length === 0) {
    body.innerHTML = `
      <div class="empty-state" style="padding:24px 0">
        <div class="empty-icon">📍</div>
        <h3>No saved addresses</h3>
        <p>Add an address for faster checkout.</p>
      </div>
      <button class="add-address-btn" id="showAddAddrForm">+ Add New Address</button>
    `;
  } else {
    body.innerHTML = `
      <div class="address-list">
        ${savedAddresses.map(a => `
          <div class="address-card ${a.isDefault ? 'default-addr' : ''}">
            <div class="address-card-text">
              <div class="addr-line1">${a.addressLine1}${a.addressLine2 ? ', ' + a.addressLine2 : ''}</div>
              <div class="addr-rest">${a.city}, ${a.state} ${a.zipCode} · ${a.country}</div>
              ${a.isDefault ? '<span class="default-badge">DEFAULT</span>' : ''}
            </div>
            <div class="address-card-actions">
              ${!a.isDefault ? `<button class="btn-addr-action" data-id="${a.id}" data-action="default">Set Default</button>` : ''}
              <button class="btn-addr-action delete" data-id="${a.id}" data-action="delete">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="add-address-btn" id="showAddAddrForm">+ Add New Address</button>
    `;
  }

  body.querySelectorAll('[data-action="default"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        await apiCall(`/addresses/${id}/default`, { method: 'PATCH' });
        await renderAccountAddresses();
      } catch (e) {}
    });
  });

  body.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this address?')) return;
      const id = btn.getAttribute('data-id');
      try {
        await apiCall(`/addresses/${id}`, { method: 'DELETE' });
        savedAddresses = savedAddresses.filter(a => a.id !== id);
        renderAddressList(body);
      } catch (e) {}
    });
  });

  const showFormBtn = document.getElementById('showAddAddrForm');
  if (showFormBtn) {
    showFormBtn.addEventListener('click', () => {
      showFormBtn.remove();
      const form = document.createElement('div');
      form.className = 'new-address-form';
      form.innerHTML = `
        <div class="form-label" style="font-weight:700;margin-bottom:4px;">New Address</div>
        <input type="text" class="form-input" id="newAddr1" placeholder="Address Line 1" required>
        <input type="text" class="form-input" id="newAddr2" placeholder="Apartment / Suite (optional)">
        <div class="form-row">
          <input type="text" class="form-input" id="newCity" placeholder="City" required>
          <input type="text" class="form-input" id="newState" placeholder="State" required>
        </div>
        <div class="form-row">
          <input type="text" class="form-input" id="newZip" placeholder="ZIP Code" required>
          <input type="text" class="form-input" id="newCountry" value="USA" readonly>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button class="checkout-btn" id="saveNewAddrBtn" style="flex:1;padding:10px;">Save Address</button>
          <button class="btn-addr-action" id="cancelNewAddr" style="padding:10px 14px;">Cancel</button>
        </div>
        <div id="newAddrErr" style="color:#E8384F;font-size:12px;min-height:16px;"></div>
      `;
      body.appendChild(form);

      document.getElementById('cancelNewAddr').addEventListener('click', () => renderAddressList(body));

      document.getElementById('saveNewAddrBtn').addEventListener('click', async () => {
        const btn2 = document.getElementById('saveNewAddrBtn');
        const errEl = document.getElementById('newAddrErr');
        const a1 = document.getElementById('newAddr1').value.trim();
        const city = document.getElementById('newCity').value.trim();
        const state = document.getElementById('newState').value.trim();
        const zip = document.getElementById('newZip').value.trim();
        if (!a1 || !city || !state || !zip) { errEl.textContent = 'Please fill all required fields.'; return; }

        btn2.disabled = true; btn2.textContent = 'Saving…';
        try {
          const res = await apiCall('/addresses', {
            method: 'POST',
            body: JSON.stringify({
              addressLine1: a1,
              addressLine2: document.getElementById('newAddr2').value.trim() || null,
              city, state, zipCode: zip, country: 'USA'
            })
          });
          const data = await res.json();
          if (res.ok && data.data) {
            savedAddresses.push(data.data);
            renderAddressList(body);
          } else {
            errEl.textContent = data.message || 'Failed to save address.';
            btn2.disabled = false; btn2.textContent = 'Save Address';
          }
        } catch (e) {
          errEl.textContent = 'Error saving address.';
          btn2.disabled = false; btn2.textContent = 'Save Address';
        }
      });
    });
  }
}

export async function renderAccountOrders() {
  const body = document.getElementById('accountTabBody');
  if (!body) return;
  body.innerHTML = `<div class="loader-container"><div class="loader-spinner"></div></div>`;

  try {
    const res = await apiCall('/orders?page=0&size=50');
    if (!res.ok) { body.innerHTML = `<p class="payment-errors" style="text-align:center">Failed to load orders.</p>`; return; }
    const result = await res.json();
    const orders = result.data?.content || [];

    if (orders.length === 0) {
      body.innerHTML = `
        <div class="empty-state" style="padding:24px 0">
          <div class="empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Start shopping and your orders will appear here.</p>
        </div>
      `;
      return;
    }

    const cfg = window.catalogConfig;
    body.innerHTML = `
      <div class="orders-list">
        ${orders.map(order => {
          const statusClass = 'status-' + order.status.toLowerCase().replace(/_/g, '-');
          const orderDate = new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
          return `
            <div class="order-row" data-order-id="${order.id}">
              <div class="order-row-left">
                <div class="order-row-number">${order.orderNumber}</div>
                <div class="order-row-date">${orderDate} · ${order.itemCount} item${order.itemCount !== 1 ? 's' : ''}</div>
              </div>
              <div class="order-row-right">
                <div class="order-row-total">${cfg.currency}${order.total.toFixed(2)}</div>
                <span class="badge-status ${statusClass}" style="margin-top:4px;display:inline-block">${order.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    body.querySelectorAll('.order-row').forEach(row => {
      row.addEventListener('click', () => openOrderDetail(row.getAttribute('data-order-id')));
    });

  } catch (e) {
    body.innerHTML = `<p class="payment-errors" style="text-align:center">Error loading orders.</p>`;
  }
}

const ORDER_STATUSES = [
  { key: 'PENDING', label: 'Order\nPlaced', icon: '📋' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
  { key: 'IN_PRODUCTION', label: 'In\nProduction', icon: '🔧' },
  { key: 'READY_TO_SHIP', label: 'Ready to\nShip', icon: '📦' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for\nDelivery', icon: '🚚' },
  { key: 'DELIVERED', label: 'Delivered', icon: '🎉' }
];

export async function openOrderDetail(orderId) {
  const modal = document.getElementById('orderDetailModal');
  const body = document.getElementById('orderDetailBody');
  if (!modal || !body) return;
  
  modal.classList.add('active');
  body.innerHTML = `<div class="loader-container"><div class="loader-spinner"></div></div>`;
  document.getElementById('orderDetailTitle').textContent = 'Order Details';
  document.getElementById('orderDetailNum').textContent = '';

  const cfg = window.catalogConfig;

  try {
    const res = await apiCall(`/orders/${orderId}`);
    if (!res.ok) { body.innerHTML = `<p class="payment-errors" style="text-align:center">Failed to load order.</p>`; return; }
    const data = await res.json();
    const order = data.data;

    document.getElementById('orderDetailTitle').textContent = order.orderNumber;
    const statusClass = 'status-' + order.status.toLowerCase().replace(/_/g, '-');
    document.getElementById('orderDetailNum').innerHTML = `
      <span class="badge-status ${statusClass}">${order.status.replace(/_/g, ' ')}</span>
      &nbsp;&nbsp;Placed ${new Date(order.createdAt).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' })}
    `;

    const isCancelled = ['CANCELLED', 'FAILED'].includes(order.status);
    let timelineHTML = '';
    if (isCancelled) {
      timelineHTML = `
        <div class="order-timeline">
          <div class="order-timeline-title">Order Status</div>
          <div style="text-align:center;padding:16px 0;color:#E8384F;font-weight:700;font-size:15px;">❌ This order has been ${order.status.toLowerCase()}.</div>
        </div>
      `;
    } else {
      const currentIdx = ORDER_STATUSES.findIndex(s => s.key === order.status);
      timelineHTML = `
        <div class="order-timeline">
          <div class="order-timeline-title">Order Progress</div>
          <div class="timeline-steps">
            ${ORDER_STATUSES.map((step, i) => {
              const isDone = i < currentIdx;
              const isCurrent = i === currentIdx;
              const cls = isDone ? 'done' : isCurrent ? 'current' : '';
              return `
                <div class="timeline-step ${cls}">
                  <div class="timeline-dot">${isDone ? '✓' : step.icon}</div>
                  <div class="timeline-label">${step.label}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    let trackingHTML = '';
    if (order.trackingNumber || order.estimatedDelivery || order.trackingNote) {
      trackingHTML = `
        <div class="tracking-info-card">
          <div class="tracking-title">📍 Shipping & Tracking</div>
          ${order.trackingNumber ? `<div class="tracking-row"><span class="tl">Tracking Number</span><span class="tv">${order.trackingNumber}</span></div>` : ''}
          ${order.estimatedDelivery ? `<div class="tracking-row"><span class="tl">Estimated Delivery</span><span class="tv">${new Date(order.estimatedDelivery).toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' })}</span></div>` : ''}
          ${order.trackingNote ? `<div class="tracking-row"><span class="tl">Status Update</span><span class="tv">${order.trackingNote}</span></div>` : ''}
        </div>
      `;
    }

    const itemsHTML = `
      <div class="order-detail-items">
        <div class="order-detail-items-title">Items Ordered</div>
        ${order.items.map(item => {
          const imgUrl = item.product.images?.[0] || 'images/logo/brand logo.jpeg';
          const variant = item.variantOptions?.map(o => o.value).join(', ');
          return `
            <div class="order-detail-item">
              <img src="${imgUrl}" alt="${item.product.name}" onerror="this.src='images/logo/brand logo.jpeg'">
              <div class="order-detail-item-info">
                <div class="order-detail-item-name">${item.product.name}</div>
                <div class="order-detail-item-meta">Qty: ${item.quantity}${variant ? ' · ' + variant : ''}</div>
              </div>
              <div class="order-detail-item-price">${cfg.currency}${item.total.toFixed(2)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const summaryHTML = `
      <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border-glass);border-radius:12px;padding:14px 16px;">
        <div class="summary-row" style="margin-bottom:6px"><span>Subtotal</span><span>${cfg.currency}${order.subtotal.toFixed(2)}</span></div>
        <div class="summary-row" style="margin-bottom:6px"><span>Delivery</span><span>${order.shippingCost > 0 ? cfg.currency + order.shippingCost.toFixed(2) : 'FREE'}</span></div>
        <div class="summary-row" style="margin-bottom:6px"><span>Tax</span><span>${cfg.currency}${order.tax.toFixed(2)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${cfg.currency}${order.total.toFixed(2)}</span></div>
      </div>
    `;

    let canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
    if (order.paymentMethod === 'ONLINE' && order.status !== 'PENDING') {
      canCancel = false;
    }
    const cancelHTML = canCancel ? `
      <button class="btn-cancel-order" id="cancelOrderBtn">Cancel This Order</button>
      <div id="cancelOrderMsg" style="text-align:center;font-size:12px;margin-top:6px;min-height:16px;"></div>
    ` : '';

    body.innerHTML = timelineHTML + trackingHTML + itemsHTML + summaryHTML + cancelHTML;

    if (canCancel) {
      document.getElementById('cancelOrderBtn').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to cancel this order?')) return;
        const btn = document.getElementById('cancelOrderBtn');
        const msg = document.getElementById('cancelOrderMsg');
        btn.disabled = true; btn.textContent = 'Cancelling…';
        try {
          const res = await apiCall(`/orders/${orderId}/cancel`, { method: 'POST' });
          const data = await res.json();
          if (res.ok) {
            msg.style.color = '#50c850';
            msg.textContent = '✓ Order cancelled successfully.';
            btn.remove();
            setTimeout(() => openOrderDetail(orderId), 800);
          } else {
            msg.style.color = '#E8384F';
            msg.textContent = data.message || 'Failed to cancel order.';
            btn.disabled = false; btn.textContent = 'Cancel This Order';
          }
        } catch (e) {
          msg.style.color = '#E8384F';
          msg.textContent = 'Error cancelling order.';
          btn.disabled = false; btn.textContent = 'Cancel This Order';
        }
      });
    }
  } catch (e) {
    body.innerHTML = `<p class="payment-errors" style="text-align:center">Error loading order details.</p>`;
  }
}

export async function openOrderHistoryModal() {
  const modal = document.getElementById('ordersModal');
  const body = document.getElementById('ordersModalBody');
  if (!modal || !body) return;
  
  modal.classList.add('active');
  body.innerHTML = `
    <div class="loader-container">
      <div class="loader-spinner"></div>
    </div>
  `;
  
  const cfg = window.catalogConfig;

  try {
    const res = await apiCall('/orders?page=0&size=50');
    if (res.ok) {
      const result = await res.json();
      const orders = result.data?.content || [];
      
      if (orders.length === 0) {
        body.innerHTML = `
          <div class="empty-state" style="padding: 24px;">
            <div class="empty-icon">📦</div>
            <h3>No orders yet</h3>
            <p>You have not placed any orders yet.</p>
          </div>
        `;
        return;
      }
      
      body.innerHTML = `
        <div class="order-history-list">
          ${orders.map(order => {
            const statusClass = `status-${order.status.toLowerCase().replace(/_/g, '-')}`;
            const orderDate = new Date(order.createdAt).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return `
              <div class="order-history-card" data-order-id="${order.id}">
                <div class="order-history-header">
                  <span class="order-num">${order.orderNumber}</span>
                  <span class="order-date">${orderDate}</span>
                </div>
                <div class="order-history-items">
                  Items: <strong>${order.itemCount} items</strong>
                </div>
                <div class="order-history-footer">
                  <span class="order-total-price">Total: ${cfg.currency}${order.total.toFixed(2)}</span>
                  <span class="badge-status ${statusClass}">${order.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('.order-history-card').forEach(card => {
        card.addEventListener('click', () => {
          openOrderDetail(card.getAttribute('data-order-id'));
        });
      });
    } else {
      body.innerHTML = `<p class="payment-errors" style="text-align:center;">Failed to load order history. Error code: ${res.status}</p>`;
    }
  } catch (e) {
    body.innerHTML = `<p class="payment-errors" style="text-align:center;">Error connecting to order server.</p>`;
  }
}

export function setupAccountModal() {
  const profileBtn = document.getElementById('profileBtn');

  if (profileBtn) {
    profileBtn.addEventListener('click', () => openAccountModal('profile'));
  }

  const accountModalClose = document.getElementById('accountModalClose');
  if (accountModalClose) {
    accountModalClose.addEventListener('click', () => {
      document.getElementById('accountModal').classList.remove('active');
    });
  }
  const accountModal = document.getElementById('accountModal');
  if (accountModal) {
    accountModal.addEventListener('click', (e) => {
      if (e.target === accountModal) {
        accountModal.classList.remove('active');
      }
    });
  }

  document.querySelectorAll('.account-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAccountTab(tab.getAttribute('data-tab')));
  });

  const orderDetailClose = document.getElementById('orderDetailClose');
  if (orderDetailClose) {
    orderDetailClose.addEventListener('click', () => {
      document.getElementById('orderDetailModal').classList.remove('active');
    });
  }
  const orderDetailModal = document.getElementById('orderDetailModal');
  if (orderDetailModal) {
    orderDetailModal.addEventListener('click', (e) => {
      if (e.target === orderDetailModal) {
        orderDetailModal.classList.remove('active');
      }
    });
  }
}

