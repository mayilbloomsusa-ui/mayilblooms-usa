/**
 * UI and Animation Controller Module
 */

export function updateAccentColor() {
  const cfg = window.catalogConfig;
  if (cfg && cfg.accentColor) {
    document.documentElement.style.setProperty('--accent', cfg.accentColor);
  }
}

export function buildNavbar() {
  const cfg = window.catalogConfig;
  const brand = document.getElementById('navbarBrand');
  if (!brand || !cfg) return;

  const logoHTML = cfg.logo
    ? `<img src="${cfg.logo}" alt="${cfg.businessName}" class="navbar-logo" id="mainLogo" onerror="this.outerHTML='<div class=\\'navbar-logo-placeholder\\'>${cfg.businessName.charAt(0)}</div>'">`
    : `<div class="navbar-logo-placeholder">${cfg.businessName.charAt(0)}</div>`;

  brand.innerHTML = `
    <div class="logo-wrapper" id="logoWrapper">
      ${logoHTML}
    </div>
    <span class="navbar-name">${cfg.businessName}</span>
  `;

  const logoWrapper = document.getElementById('logoWrapper');
  let showerInterval = null;

  function spawnFlowers() {
    const flowerList = ['🌸', '🌼', '🌺', '🌹', '🌻', '💮', '🌷'];
    const count = 8;

    for (let i = 0; i < count; i++) {
      const f = document.createElement('div');
      f.className = 'flower-particle';
      f.textContent = flowerList[Math.floor(Math.random() * flowerList.length)];

      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 100;
      const tx = (Math.cos(angle) * dist) + 'px';
      const ty = (Math.sin(angle) * dist) + 'px';
      const tr = ((Math.random() - 0.5) * 1080) + 'deg';

      f.style.setProperty('--tx', tx);
      f.style.setProperty('--ty', ty);
      f.style.setProperty('--tr', tr);

      logoWrapper.appendChild(f);
      setTimeout(() => f.remove(), 1200);
    }
  }

  brand.addEventListener('mouseenter', () => {
    spawnFlowers();
    showerInterval = setInterval(spawnFlowers, 400);
  });

  brand.addEventListener('mouseleave', () => {
    if (showerInterval) clearInterval(showerInterval);
  });

  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');

  function toggleMenu() {
    if (!sideMenu || !menuOverlay) return;
    sideMenu.classList.toggle('active');
    menuOverlay.classList.toggle('active');
    menuToggle.textContent = sideMenu.classList.contains('active') ? '✕' : '☰';
  }

  if (menuToggle && sideMenu && menuOverlay) {
    menuToggle.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', toggleMenu);
    sideMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', toggleMenu);
    });
  }

  function handleScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }

  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      handleScroll();
      scrollTicking = false;
    });
  }, { passive: true });
  handleScroll();
}

export function buildHero() {
  const cfg = window.catalogConfig;
  const slidesContainer = document.getElementById('heroSlides');
  if (!cfg || !slidesContainer) return;

  const slides = (cfg.heroSlides && cfg.heroSlides.length > 0
    ? [...cfg.heroSlides]
    : (cfg.products && cfg.products.length > 0
      ? cfg.products.slice(0, 4).map(f => ({ image: (cfg.imagesFolder || 'images') + '/' + f, title: cfg.heroTitle, subtitle: cfg.heroSubtitle }))
      : []));

  if (slides.length > 0) {
    slides.push({
      image: slides[0].image,
      title: "Exclusive Savings Active",
      subtitle: "🎁 FREE delivery on orders over $100! • Save 10% on bulk purchases above $200!"
    });
  }

  if (slides.length === 0) {
    slidesContainer.innerHTML = `<div class="hero-slide active" style="background: linear-gradient(135deg, #1a0a10, #0a0a15); width:100%; height:100%;"></div>`;
    return;
  }

  slidesContainer.innerHTML = '';
  slides.forEach((slideData, i) => {
    const slide = document.createElement('div');
    slide.className = 'hero-slide' + (i === 0 ? ' active' : '');
    slide.innerHTML = `<img src="${slideData.image}" alt="Slide ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}" ${i === 0 ? 'fetchpriority="high"' : ''}>`;
    slidesContainer.appendChild(slide);
  });

  if (slides.length > 1) {
    let currentSlide = 0;
    const slideElements = slidesContainer.querySelectorAll('.hero-slide');

    function updateSlideContent(index) {
      const data = slides[index];
      const titleEl = document.getElementById('heroTitle');
      const subEl = document.getElementById('heroSubtitle');

      if (data.title && titleEl) titleEl.textContent = data.title;
      if (data.subtitle && subEl) subEl.textContent = data.subtitle;
    }

    updateSlideContent(0);

    setInterval(() => {
      if (slideElements[currentSlide]) slideElements[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slideElements.length;
      if (slideElements[currentSlide]) slideElements[currentSlide].classList.add('active');
      updateSlideContent(currentSlide);
    }, 6000);
  } else if (slides.length === 1) {
    const data = slides[0];
    const titleEl = document.getElementById('heroTitle');
    const subEl = document.getElementById('heroSubtitle');
    if (data.title && titleEl) titleEl.textContent = data.title;
    if (data.subtitle && subEl) subEl.textContent = data.subtitle;
  }
}

export function buildFAB() {
  const cfg = window.catalogConfig;
  const contact = cfg?.contactDetails || {};
  const actions = document.getElementById('fabActions');
  const fabMain = document.getElementById('fabMain');
  const container = document.getElementById('fabContainer');
  if (!actions || !fabMain || !container) return;

  actions.innerHTML = '';
  if (contact.whatsapp) {
    const waLink = `https://wa.me/${contact.whatsapp.replace(/[^+\d]/g, '')}?text=Hi! I'm interested in your artificial flowers catalog.`;
    actions.innerHTML += `
      <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="fab-action">
        <div class="fab-action-icon wa">
          <svg viewBox="0 0 448 512" width="20" height="20" fill="white"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.4-8.6-44.6-27.6-16.5-14.7-27.6-32.8-30.8-38.4-3.2-5.6-.3-8.6 2.5-11.4 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.2 3.7-5.5 5.5-9.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.5 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
        </div>
        WhatsApp
      </a>
    `;
  }

  if (contact.phone) {
    actions.innerHTML += `
      <a href="tel:${contact.phone.replace(/[^+\d]/g, '')}" class="fab-action">
        <div class="fab-action-icon call">
          <svg viewBox="0 0 512 512" width="18" height="18" fill="white"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>
        </div>
        Call Now
      </a>
    `;
  }

  fabMain.addEventListener('click', () => {
    container.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      container.classList.remove('open');
    }
  });
}

export function buildFooter() {
  const cfg = window.catalogConfig;
  const brand = document.getElementById('footerBrand');
  const text = document.getElementById('footerText');
  const copy = document.getElementById('footerCopy');
  if (!cfg) return;

  if (brand) brand.textContent = cfg.businessName;
  if (text) text.textContent = cfg.tagline || 'Premium Artificial Flowers';
  if (copy) copy.innerHTML = `&copy; ${new Date().getFullYear()} ${cfg.businessName}. All rights reserved.`;
}

export function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  const count = Math.min(50, Math.floor(window.innerWidth / 30));

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.4 - 0.1,
      radius: Math.random() * 2.5 + 0.8,
      baseOpacity: Math.random() * 0.5 + 0.3,
      hue: Math.random() > 0.6 ? 45 : (Math.random() > 0.5 ? 55 : 0),
      lightness: Math.random() > 0.8 ? 95 : 75,
      offset: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const time = Date.now() / 800;

    particles.forEach(p => {
      const currentOpacity = p.baseOpacity + Math.sin(time + p.offset) * 0.2;
      const safeOpacity = Math.max(0.1, Math.min(1, currentOpacity));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.shadowBlur = 12;
      ctx.shadowColor = `hsla(${p.hue}, 80%, ${p.lightness}%, ${safeOpacity})`;
      ctx.fillStyle = `hsla(${p.hue}, 90%, ${p.lightness}%, ${safeOpacity})`;
      ctx.fill();
      ctx.shadowBlur = 0;

      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -20) { p.y = canvas.height + 20; p.x = Math.random() * canvas.width; }
      if (p.x < -20) p.x = canvas.width + 20;
      if (p.x > canvas.width + 20) p.x = -20;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

export function initScrollReveal() {
  // Disabled for smoother rendering and butter-smooth scrolling
}

export function initCardSpotlight() {
  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', x + '%');
    card.style.setProperty('--mouse-y', y + '%');
  });
}

export function buildContact() {
  const cfg = window.catalogConfig;
  const contactGrid = document.getElementById('contactGrid');
  if (!cfg || !contactGrid) return;

  const contact = cfg.contactDetails || {};
  contactGrid.innerHTML = '';

  const items = [];

  if (contact.phone) {
    items.push({
      class: 'phone',
      label: 'Call Us',
      value: contact.phone,
      link: `tel:${contact.phone.replace(/[^+\d]/g, '')}`,
      icon: `<svg viewBox="0 0 512 512" width="22" height="22" fill="white"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>`
    });
  }

  if (contact.whatsapp) {
    items.push({
      class: 'whatsapp',
      label: 'WhatsApp',
      value: contact.whatsapp,
      link: `https://wa.me/${contact.whatsapp.replace(/[^+\d]/g, '')}?text=Hi! I'm interested in your artificial flowers catalog.`,
      icon: `<svg viewBox="0 0 448 512" width="22" height="22" fill="white"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.4-8.6-44.6-27.6-16.5-14.7-27.6-32.8-30.8-38.4-3.2-5.6-.3-8.6 2.5-11.4 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.2 3.7-5.5 5.5-9.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.5 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>`
    });
  }

  if (contact.email) {
    items.push({
      class: 'email',
      label: 'Email Us',
      value: contact.email,
      link: `mailto:${contact.email}`,
      icon: `<svg viewBox="0 0 512 512" width="20" height="20" fill="white"><path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-112-48-112H48zM0 180V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V180L289.2 341.3c-9.7 7.3-21.8 11-33.2 11s-23.5-3.7-33.2-11L0 180z"/></svg>`
    });
  }

  if (contact.facebook) {
    items.push({
      class: 'facebook',
      label: 'Facebook',
      value: 'Follow Facebook Page',
      link: contact.facebook,
      icon: `<svg viewBox="0 0 512 512" width="22" height="22" fill="white"><path d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z"/></svg>`
    });
  }

  if (contact.instagram) {
    items.push({
      class: 'instagram',
      label: 'Instagram',
      value: '@mayilblooms',
      link: contact.instagram,
      icon: `<svg viewBox="0 0 448 512" width="20" height="20" fill="white"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.9c-41.4 0-75-33.6-75-75s33.6-75 75-75 75 33.6 75 75-33.6 75-75 75zm134.6-229c0 14.9-12 27-27 27s-27-12-27-27 12-27 27-27 27 12 27 27zm11.2 57c-1.8-38.3-10.6-72.1-38.7-100.2-28-28-61.9-36.8-100.2-38.7-39.7-1.8-159-1.8-198.7 0-38.3 1.8-72.1 10.6-100.2 38.7-28 28-36.8 61.9-38.7 100.2-1.8 39.7-1.8 159 0 198.7 1.8 38.3 10.6 72.1 38.7 100.2 28 28 61.9 36.8 100.2 38.7 39.7 1.8 159 1.8 198.7 0 38.3-1.8 72.1-10.6 100.2-38.7 28-28 36.8-61.9 38.7-100.2 1.8-39.7 1.8-159 0-198.7zM402.1 402c-22.6 22.6-58.5 32.4-96.2 34-37.7 1.7-151 1.7-188.7 0-37.7-1.6-73.6-11.4-96.2-34-22.6-22.6-32.4-58.5-34-96.2-1.7-37.7-1.7-151 0-188.7 1.6-37.7 11.4-73.6 34-96.2 22.6-22.6 58.5-32.4 96.2-34 37.7-1.7 151-1.7 188.7 0 37.7 1.6 73.6 11.4 96.2 34 22.6 22.6 32.4 58.5 34 96.2 1.7 37.7 1.7 151 0 188.7-1.6 37.7-11.4 73.6-34 96.2z"/></svg>`
    });
  }

  if (contact.youtube) {
    items.push({
      class: 'youtube',
      label: 'YouTube',
      value: 'Subscribe on YouTube',
      link: contact.youtube,
      icon: `<svg viewBox="0 0 576 512" width="22" height="22" fill="white"><path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-12.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.537V175.185l142.739 81.205-142.739 81.23z"/></svg>`
    });
  }

  if (contact.address) {
    items.push({
      class: 'address',
      label: 'Location',
      value: contact.address,
      link: `https://maps.google.com/?q=${encodeURIComponent(contact.address)}`,
      icon: `<svg viewBox="0 0 384 512" width="18" height="18" fill="white"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/></svg>`
    });
  }

  items.forEach(item => {
    const card = document.createElement('a');
    card.className = 'contact-card';
    card.href = item.link;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.innerHTML = `
      <div class="contact-icon ${item.class}">
        ${item.icon}
      </div>
      <div class="contact-details">
        <div class="contact-label">${item.label}</div>
        <div class="contact-value">${item.value}</div>
      </div>
    `;
    contactGrid.appendChild(card);
  });
}

