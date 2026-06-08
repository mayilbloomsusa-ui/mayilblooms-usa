/**
 * Product Catalog Render and Detail Controller Module
 */

import { cleanProductName, parsePrice, escapeHtml, responsiveImageHtml } from './utils.js';
import { apiCall, auth } from './auth.js';

const productDetailCache = new Map();
let gridEventsBound = false;
let globalImageIndex = 0;

function resetCatalogState() {
  productDetailCache.clear();
  globalImageIndex = 0;
}

function productImageHtml(src, alt, eager = false) {
  return responsiveImageHtml(src, alt, { eager });
}

function nextImageEager() {
  return globalImageIndex++ < 4;
}

function registerProductDetail(key, data) {
  productDetailCache.set(key, data);
}

export function showCatalogLoading() {
  const mainContainer = document.getElementById('products');
  if (!mainContainer) return;
  mainContainer.innerHTML = `
    <div class="section-header">
      <span class="section-badge">Loading</span>
      <h2 class="section-title">Our Collection</h2>
      <div class="divider"></div>
    </div>
    <div class="product-grid catalog-skeleton-grid">
      ${Array.from({ length: 8 }, () => '<div class="product-card skeleton-card" aria-hidden="true"></div>').join('')}
    </div>
  `;
}

export function initProductGridEvents() {
  if (gridEventsBound) return;
  gridEventsBound = true;

  const container = document.getElementById('products');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card[data-product-key]');
    if (!card || e.target.closest('button, select, .variant-chip')) return;

    const key = card.getAttribute('data-product-key');
    const cached = productDetailCache.get(key);
    if (!cached) return;

    if (cached.type === 'db') {
      const selectedChip = card.querySelector('.variant-chip.selected');
      const activePrice = selectedChip ? parseFloat(selectedChip.getAttribute('data-price')) : cached.basePrice;
      const activeOriginal = selectedChip ? parseFloat(selectedChip.getAttribute('data-compare')) : cached.baseOriginal;
      openProductDetail({
        id: cached.id,
        name: cached.name,
        images: cached.images,
        price: activePrice,
        originalPrice: activeOriginal > activePrice ? activeOriginal : null,
        discountPct: activeOriginal > activePrice
          ? Math.round((1 - activePrice / activeOriginal) * 100)
          : (cached.flatDiscount || 0),
        currency: cached.currency,
        tag: cached.tag,
        variants: cached.variants,
        weight: cached.weight,
        description: cached.description
      });
    } else {
      openProductDetail({
        name: cached.name,
        images: cached.images,
        price: cached.price,
        originalPrice: cached.originalPrice,
        discountPct: cached.discountPct,
        currency: cached.currency,
        tag: cached.tag,
        variants: null,
        weight: cached.weight,
        description: cached.description
      });
    }
  });
}

export function buildProducts() {
  const cfg = window.catalogConfig;
  const mainContainer = document.getElementById('products');
  if (!cfg || !mainContainer) return;

  resetCatalogState();
  const flatDiscount = cfg.flatDiscount || 0;
  mainContainer.innerHTML = '';

  const categories = cfg.categories || [{ name: "Our Collection", id: "all", products: cfg.products || [] }];
  let totalProductsCount = 0;

  categories.forEach((cat, catIdx) => {
    const groups = {};
    cat.products.forEach(fn => {
      const name = cleanProductName(fn);
      const { price, isUnavailable } = parsePrice(fn);
      if (!groups[name]) groups[name] = { name, images: [], prices: [], rawFilenames: [], unavailableMap: {} };
      groups[name].images.push((cfg.imagesFolder || 'images') + '/' + fn);
      groups[name].rawFilenames.push(fn);
      if (price !== null) groups[name].prices.push(price);
      groups[name].unavailableMap[fn] = isUnavailable;
    });

    const productEntries = Object.values(groups);
    totalProductsCount += productEntries.length;

    const header = document.createElement('div');
    header.className = 'section-header';
    header.id = cat.id;
    if (catIdx > 0) header.style.marginTop = '100px';
    header.innerHTML = `
      <span class="section-badge">${catIdx === 0 ? 'Featured' : 'Collection'}</span>
      <h2 class="section-title">${escapeHtml(cat.name)}</h2>
      <div class="divider"></div>
      ${catIdx === 0 ? '<p class="section-subtitle">Premium handcrafted artificial flowers and crafts</p>' : ''}
    `;
    mainContainer.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'product-grid';
    mainContainer.appendChild(grid);

    if (productEntries.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No items found in this category.</div>`;
      return;
    }

    productEntries.forEach((group, index) => {
      const isGroupUnavailable = group.rawFilenames.every(fn => group.unavailableMap[fn]);
      
      let finalPrice = group.prices.length > 0 ? Math.min(...group.prices) : 0;
      let originalPrice = (flatDiscount > 0 && flatDiscount < 100)
        ? Math.ceil(finalPrice / (1 - (flatDiscount / 100)))
        : finalPrice;

      let variationTag = 'Handcrafted Design';
      const allRaws = group.rawFilenames.join(' ').toUpperCase();
      if (allRaws.includes('INCH')) {
        variationTag = 'Available in 16" and 8" sizes';
      } else if (allRaws.includes('PIECES') || allRaws.includes('PIECE') || allRaws.includes('PCS')) {
        const pieceMatch = allRaws.match(/(\d+)\s*(PIECES|PIECE|PCS)/);
        variationTag = pieceMatch ? `${pieceMatch[1]} Pieces Set` : 'Complete Set';
      }

      const actionsHTML = isGroupUnavailable ? '' : `
        <div class="product-actions">
          <div class="quantity-selector">
            <button class="qty-btn qty-minus" data-name="${group.name.replace(/"/g, '&quot;')}">−</button>
            <span class="qty-val" id="qty-${group.name.replace(/\s+/g, '-')}">1</span>
            <button class="qty-btn qty-plus" data-name="${group.name.replace(/"/g, '&quot;')}">+</button>
          </div>
          <button class="btn-add-cart" data-name="${group.name.replace(/"/g, '&quot;')}" data-price="${finalPrice}" data-weight="500">
            <span>Add to Cart</span>
          </button>
        </div>
      `;

      const images = group.images && group.images.length > 0 ? group.images : ['images/logo/brand logo.jpeg'];
      const productKey = `static-${cat.id}-${index}`;
      const safeName = group.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
      const sliderHTML = productImageHtml(images[0], group.name, nextImageEager());

      registerProductDetail(productKey, {
        type: 'static',
        name: group.name,
        images,
        price: finalPrice,
        originalPrice: originalPrice > finalPrice ? originalPrice : null,
        discountPct: flatDiscount || 0,
        currency: cfg.currency,
        tag: cat.name.includes('Craft') ? 'Specialty Craft' : 'Premium Flower',
        weight: 500,
        description: ''
      });

      const card = document.createElement('div');
      card.className = 'product-card' + (isGroupUnavailable ? ' unavailable' : '');
      card.setAttribute('data-product-key', productKey);
      card.innerHTML = `
        <div class="product-image-wrapper">
          ${sliderHTML}
          <div class="product-image-overlay"></div>
          ${isGroupUnavailable ? '<div class="unavailable-badge"><span>Coming soon</span></div>' : ''}
          ${flatDiscount > 0 && !isGroupUnavailable ? `<div class="discount-tag">${flatDiscount}% OFF</div>` : ''}
          ${finalPrice > 0 ? `
            <div class="product-price-badge" id="price-badge-${safeName}">
              <span class="original-price">${cfg.currency}${originalPrice}</span>
              <span>${cfg.currency}${finalPrice}</span>
            </div>
          ` : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${escapeHtml(group.name)}</div>
          <div class="product-tag">${cat.name.includes('Craft') ? 'Specialty Craft' : 'Premium Flower'}</div>
          <span class="variation-tag">${escapeHtml(variationTag)}</span>
          ${actionsHTML}
        </div>
      `;

      grid.appendChild(card);
    });
  });

  const statProd = document.getElementById('statProducts');
  if (statProd) statProd.textContent = totalProductsCount + '+';
}

export function buildProductsFromDb(products, categories) {
  const cfg = window.catalogConfig;
  const mainContainer = document.getElementById('products');
  if (!cfg || !mainContainer) return;

  resetCatalogState();
  const flatDiscount = cfg.flatDiscount || 0;
  mainContainer.innerHTML = '';

  const activeProducts = products.filter(p => p.isActive !== false);

  const sortedCats = [...categories]
    .filter(c => c.isActive !== false)
    .filter(c => c.productCount > 0 || activeProducts.some(p => p.categoryId === c.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const catProductMap = {};
  sortedCats.forEach(cat => { catProductMap[cat.id] = []; });
  activeProducts.forEach(p => {
    if (catProductMap[p.categoryId] !== undefined) {
      catProductMap[p.categoryId].push(p);
    }
  });

  let totalProductsCount = 0;
  let catIdx = 0;

  sortedCats.forEach(cat => {
    const catProducts = catProductMap[cat.id] || [];
    if (catProducts.length === 0) return;

    totalProductsCount += catProducts.length;

    const header = document.createElement('div');
    header.className = 'section-header';
    header.id = cat.name.toLowerCase().replace(/\s+/g, '-');
    if (catIdx > 0) header.style.marginTop = '100px';
    header.innerHTML = `
      <span class="section-badge">${catIdx === 0 ? 'Featured' : 'Collection'}</span>
      <h2 class="section-title">${escapeHtml(cat.name)}</h2>
      <div class="divider"></div>
      ${catIdx === 0 ? '<p class="section-subtitle">Premium handcrafted artificial flowers and crafts</p>' : ''}
    `;
    mainContainer.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'product-grid';
    mainContainer.appendChild(grid);

    catProducts.forEach((product, index) => {
      const isUnavailable = !product.isActive || product.stock === 0;

      let finalPrice = product.price || 0;
      let originalPrice = product.compareAtPrice || 0;

      let variantChipsHTML = '';
      if (product.hasVariants && product.variants && product.variants.length > 0) {
        const sortedVariants = [...product.variants]
          .filter(v => v.isActive)
          .sort((a, b) => {
            const aVal = a.options?.[0]?.value || '';
            const bVal = b.options?.[0]?.value || '';
            return aVal.localeCompare(bVal);
          });

        if (sortedVariants.length > 0) {
          finalPrice = sortedVariants[0].price;
          originalPrice = sortedVariants[0].compareAtPrice || 0;

          variantChipsHTML = `
            <div class="variant-selector">
              <span class="variant-selector-label">Size</span>
              <div class="variant-chips">
                ${sortedVariants.map((v, i) => {
                  const val = v.options?.[0]?.value || '';
                  const label = val === '8inch' ? '8 inch' : val === '16inch' ? '16 inch' : val;
                  const compareVal = v.compareAtPrice || 0;
                  return `<button class="variant-chip${i === 0 ? ' selected' : ''}" data-variant-id="${v.id}" data-price="${v.price}" data-compare="${compareVal}" data-label="${escapeHtml(label)}" data-weight="${v.weight || product.weight || 500}" data-product-name="${escapeHtml(product.name)}" type="button">
                    <span class="chip-label">${escapeHtml(label)}</span>
                    <span class="chip-price">${cfg.currency}${v.price}</span>
                  </button>`;
                }).join('')}
              </div>
            </div>
          `;
        }
      }

      const discountPct = (originalPrice > finalPrice && originalPrice > 0)
        ? Math.round((1 - finalPrice / originalPrice) * 100)
        : (flatDiscount || 0);

      const variationTag = product.hasVariants ? 'Available in 8" and 16" sizes' : 'Handcrafted Design';
      const safeName = product.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

      const actionsHTML = isUnavailable ? '' : `
        <div class="product-actions">
          <div class="quantity-selector">
            <button class="qty-btn qty-minus" data-name="${product.name.replace(/"/g, '&quot;')}">−</button>
            <span class="qty-val" id="qty-${safeName}">1</span>
            <button class="qty-btn qty-plus" data-name="${product.name.replace(/"/g, '&quot;')}">+</button>
          </div>
          <button class="btn-add-cart" data-name="${product.name.replace(/"/g, '&quot;')}" data-price="${finalPrice}" data-weight="${product.weight || 500}">
            <span>Add to Cart</span>
          </button>
        </div>
      `;

      const images = product.images && product.images.length > 0 ? product.images : ['images/logo/brand logo.jpeg'];
      const sliderHTML = productImageHtml(images[0], product.name, nextImageEager());
      const productKey = `db-${product.id}`;

      registerProductDetail(productKey, {
        type: 'db',
        id: product.id,
        name: product.name,
        images,
        basePrice: finalPrice,
        baseOriginal: originalPrice,
        flatDiscount,
        currency: cfg.currency,
        tag: cat.name.includes('Craft') ? 'Specialty Craft' : 'Premium Flower',
        variants: (product.hasVariants && product.variants) ? product.variants.filter(v => v.isActive) : null,
        weight: product.weight || 500,
        description: product.description || ''
      });

      const card = document.createElement('div');
      card.className = 'product-card' + (isUnavailable ? ' unavailable' : '');
      card.setAttribute('data-product-key', productKey);
      card.innerHTML = `
        <div class="product-image-wrapper">
          ${sliderHTML}
          <div class="product-image-overlay"></div>
          ${isUnavailable ? '<div class="unavailable-badge"><span>Coming soon</span></div>' : ''}
          ${discountPct > 0 && !isUnavailable ? `<div class="discount-tag">${discountPct}% OFF</div>` : ''}
          ${finalPrice > 0 ? `
            <div class="product-price-badge" id="price-badge-${safeName}">
              ${originalPrice > finalPrice ? `<span class="original-price">${cfg.currency}${originalPrice}</span>` : ''}
              <span>${cfg.currency}${finalPrice}</span>
            </div>
          ` : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="product-tag">${cat.name.includes('Craft') ? 'Specialty Craft' : 'Premium Flower'}</div>
          <span class="variation-tag">${escapeHtml(variationTag)}</span>
          ${variantChipsHTML}
          ${actionsHTML}
        </div>
      `;

      grid.appendChild(card);
    });

    catIdx++;
  });

  const statProd = document.getElementById('statProducts');
  if (statProd) statProd.textContent = totalProductsCount + '+';
}

export function initCardSlider() {
  // Card sliders disabled for scroll performance.
}

export function initLazyImages() {
  // Native loading="lazy" on product images handles deferred loading.
}

export function openProductDetail(productData) {
  const modal = document.getElementById('productDetailModal');
  const cfg = window.catalogConfig;
  if (!modal || !cfg) return;

  document.getElementById('pdName').textContent = productData.name;
  document.getElementById('pdTag').textContent = productData.tag || 'Premium Flower';

  document.getElementById('pdPrice').textContent = cfg.currency + productData.price;
  const origEl = document.getElementById('pdOriginalPrice');
  const discEl = document.getElementById('pdDiscountBadge');
  if (productData.originalPrice && productData.originalPrice > productData.price) {
    origEl.textContent = cfg.currency + productData.originalPrice;
    origEl.style.display = '';
    discEl.textContent = productData.discountPct + '% OFF';
    discEl.style.display = '';
  } else {
    origEl.style.display = 'none';
    discEl.style.display = 'none';
  }

  document.getElementById('pdDesc').textContent =
    productData.description || 'Premium handcrafted artificial flower — beautifully designed to last forever without any maintenance.';

  const mainImg = document.getElementById('pdMainImg');
  const thumbsEl = document.getElementById('pdThumbs');
  const images = productData.images && productData.images.length > 0 ? productData.images : ['images/logo/brand logo.jpeg'];
  
  if (mainImg) {
    mainImg.src = images[0];
    mainImg.alt = productData.name;
  }
  
  if (thumbsEl) {
    thumbsEl.innerHTML = '';
    if (images.length > 1) {
      images.forEach((src, i) => {
        const thumb = document.createElement('img');
        thumb.className = 'product-detail-thumb' + (i === 0 ? ' active' : '');
        thumb.src = src;
        thumb.alt = productData.name;
        thumb.onclick = () => {
          mainImg.src = src;
          thumbsEl.querySelectorAll('.product-detail-thumb').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        };
        thumbsEl.appendChild(thumb);
      });
    }
  }

  const variantsEl = document.getElementById('pdVariants');
  variantsEl.innerHTML = '';
  let currentPrice = productData.price;
  let currentOriginal = productData.originalPrice;
  let currentVariantId = null;
  let currentWeight = productData.weight || 500;

  if (productData.variants && productData.variants.length > 0) {
    const container = document.createElement('div');
    container.className = 'variant-selector';
    container.innerHTML = '<span class="variant-selector-label">Size</span>';
    const chips = document.createElement('div');
    chips.className = 'variant-chips';

    productData.variants.forEach((v, i) => {
      const val = v.options?.[0]?.value || '';
      const label = val === '8inch' ? '8 inch' : val === '16inch' ? '16 inch' : val;
      const chip = document.createElement('button');
      chip.className = 'variant-chip' + (i === 0 ? ' selected' : '');
      chip.type = 'button';
      chip.innerHTML = '<span class="chip-label">' + label + '</span><span class="chip-price">' + cfg.currency + v.price + '</span>';
      chip.onclick = () => {
        chips.querySelectorAll('.variant-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        currentPrice = v.price;
        currentOriginal = v.compareAtPrice || 0;
        currentVariantId = v.id;
        currentWeight = v.weight || productData.weight || 500;
        document.getElementById('pdPrice').textContent = cfg.currency + currentPrice;
        if (currentOriginal && currentOriginal > currentPrice) {
          origEl.textContent = cfg.currency + currentOriginal;
          origEl.style.display = '';
          const pct = Math.round((1 - currentPrice / currentOriginal) * 100);
          discEl.textContent = pct + '% OFF';
          discEl.style.display = '';
        } else {
          origEl.style.display = 'none';
          discEl.style.display = 'none';
        }
      };
      if (i === 0) {
        currentVariantId = v.id;
        currentWeight = v.weight || productData.weight || 500;
      }
      chips.appendChild(chip);
    });
    container.appendChild(chips);
    variantsEl.appendChild(container);
  }

  let qty = 1;
  const qtyVal = document.getElementById('pdQtyVal');
  if (qtyVal) qtyVal.textContent = qty;
  
  document.getElementById('pdQtyMinus').onclick = () => {
    if (qty > 1) { qty--; if (qtyVal) qtyVal.textContent = qty; }
  };
  document.getElementById('pdQtyPlus').onclick = () => {
    qty++;
    if (qtyVal) qtyVal.textContent = qty;
  };

  const addBtn = document.getElementById('pdAddToCart');
  if (addBtn) {
    addBtn.textContent = 'Add to Cart';
    addBtn.classList.remove('added');
    addBtn.onclick = () => {
      const selectedChip = variantsEl.querySelector('.variant-chip.selected');
      const variantLabel = selectedChip ? selectedChip.querySelector('.chip-label')?.textContent : null;
      window.localCart.add(productData.name, currentPrice, qty, images[0], currentVariantId, variantLabel, currentWeight);

      addBtn.textContent = '✓ Added!';
      addBtn.classList.add('added');
      setTimeout(() => {
        addBtn.textContent = 'Add to Cart';
        addBtn.classList.remove('added');
      }, 1800);
    };
  }

  const reviewsEl = document.getElementById('pdReviews');
  if (productData.id) {
    reviewsEl.innerHTML = '<div style="text-align:center; padding:16px; color:var(--text-muted);">Loading reviews...</div>';
    loadReviews(productData.id);
  } else {
    reviewsEl.innerHTML = '<div class="review-no-reviews">Reviews not available for this catalog product.</div>';
  }

  modal.classList.add('active');
}

export async function loadReviews(productId) {
  const reviewsEl = document.getElementById('pdReviews');
  try {
    const res = await apiCall(`/reviews/product/${productId}`);
    if (res.ok) {
      const body = await res.json();
      const reviews = body.data || [];
      renderReviewsList(productId, reviews);
    } else {
      reviewsEl.innerHTML = '<div class="review-no-reviews" style="color:var(--error);">Failed to load reviews.</div>';
    }
  } catch (e) {
    console.error('Error loading reviews:', e);
    reviewsEl.innerHTML = '<div class="review-no-reviews" style="color:var(--error);">Error loading reviews.</div>';
  }
}

export function renderReviewsList(productId, reviews) {
  const reviewsEl = document.getElementById('pdReviews');
  let html = '';
  
  if (reviews.length === 0) {
    html += '<div class="review-no-reviews">No reviews yet — be the first to review this product!</div>';
  } else {
    reviews.forEach(r => {
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        if (i <= r.rating) {
          starsHtml += '<span class="review-star">&#9733;</span>';
        } else {
          starsHtml += '<span class="review-star empty">&#9733;</span>';
        }
      }
      
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '';
      html += `
        <div class="review-card">
          <div class="review-card-top">
            <span class="review-author">${escapeHtml(r.userName || 'Customer')}</span>
            <span class="review-date">${escapeHtml(dateStr)}</span>
          </div>
          <div class="review-stars">
            ${starsHtml}
          </div>
          <div class="review-body">${escapeHtml(r.comment || '')}</div>
          ${r.adminReply ? `
            <div class="review-admin-reply" style="margin-top: 8px; padding-left: 12px; border-left: 2px solid var(--accent); font-size: 12px; color: var(--text-muted);">
              <strong>Response from team:</strong> ${escapeHtml(r.adminReply)}
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  if (auth.isLoggedIn()) {
    html += `
      <form id="reviewSubmitForm" class="review-submit-form" style="margin-top: 16px;">
        <div class="review-form-title">Leave a Review</div>
        <div class="rating-input-container">
          <span class="rating-label">Rating:</span>
          <div class="star-rating-input">
            <input type="radio" id="review-star5" name="rating" value="5" /><label for="review-star5" title="5 stars">&#9733;</label>
            <input type="radio" id="review-star4" name="rating" value="4" /><label for="review-star4" title="4 stars">&#9733;</label>
            <input type="radio" id="review-star3" name="rating" value="3" /><label for="review-star3" title="3 stars">&#9733;</label>
            <input type="radio" id="review-star2" name="rating" value="2" /><label for="review-star2" title="2 stars">&#9733;</label>
            <input type="radio" id="review-star1" name="rating" value="1" /><label for="review-star1" title="1 star">&#9733;</label>
          </div>
        </div>
        <div class="comment-input-container">
          <textarea id="reviewComment" placeholder="Write your review here... (max 1000 characters)" maxlength="1000" required></textarea>
        </div>
        <button type="submit" class="btn-submit-review" id="reviewSubmitBtn">Submit Review</button>
        <div id="reviewSubmitError" class="review-submit-error" style="display:none; color: var(--accent); font-size: 12px; margin-top: 5px;"></div>
      </form>
    `;
  } else {
    html += `
      <div class="review-login-prompt">
        Please <a href="#" id="reviewLoginBtn">Sign In</a> to write a review.
      </div>
    `;
  }

  reviewsEl.innerHTML = html;

  const loginBtn = document.getElementById('reviewLoginBtn');
  if (loginBtn) {
    loginBtn.onclick = (e) => {
      e.preventDefault();
      window.openAccountModal('profile');
    };
  }

  const form = document.getElementById('reviewSubmitForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const ratingVal = form.querySelector('input[name="rating"]:checked')?.value;
      const commentVal = document.getElementById('reviewComment').value;
      const errorEl = document.getElementById('reviewSubmitError');
      const submitBtn = document.getElementById('reviewSubmitBtn');

      if (!ratingVal) {
        errorEl.textContent = 'Please select a rating.';
        errorEl.style.display = 'block';
        return;
      }

      errorEl.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const submitRes = await apiCall('/reviews', {
          method: 'POST',
          body: JSON.stringify({
            productId: productId,
            rating: parseInt(ratingVal),
            comment: commentVal
          })
        });

        if (submitRes.ok) {
          loadReviews(productId);
        } else {
          const errJson = await submitRes.json().catch(() => ({}));
          errorEl.textContent = errJson.message || 'Failed to submit review. Make sure you have ordered this product.';
          errorEl.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Review';
        }
      } catch (err) {
        console.error('Error submitting review:', err);
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
      }
    };
  }
}
