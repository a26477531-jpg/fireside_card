// Cards use the same renderer, translations and text fitting as the library.
(() => {
  const host = document.querySelector('.banner-slides');
  const carousel = document.getElementById('banner-carousel');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, playing = !motion.matches, hovering = false, timer;
  const data = () => window.PROMOTIONS || [];
  function schedule() {
    clearTimeout(timer);
    if (playing && !hovering && !document.hidden && data().length > 1)
      timer = setTimeout(() => show(current + 1), 8000);
  }
  function show(index) {
    const slides = [...host.children];
    if (!slides.length) return;
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== current;
      slide.classList.toggle('is-active', i === current);
    });
    document.getElementById('banner-count').textContent = `${current + 1} / ${slides.length}`;
    window.CardTextFit.schedule(host);
    schedule();
  }
  function renderPromotions() {
    const language = window.CardI18n.language;
    host.innerHTML = data().map(promo => {
      const copy = promo.copy[language] || promo.copy['zh-TW'];
      const theme = ['abyss', 'inferno', 'grove'].includes(promo.theme) ? promo.theme : 'abyss';
      const href = promo.href === '#shop' || promo.href === 'shop.html' ? 'shop.html' : (/^#[\w-]+$/.test(promo.href) ? promo.href : 'shop.html');
      const cards = promo.cardIds.map(id => window.CARDS.find(card => card.id === id)).filter(Boolean);
      return `<article class="promo-slide promo-${theme}" lang="${escapeHTML(language)}" hidden>
        <div class="promo-copy"><p class="promo-eyebrow">${escapeHTML(copy.eyebrow)}</p>
          <h2>${escapeHTML(copy.title)}</h2><p class="promo-subtitle">${escapeHTML(copy.subtitle)}</p>
          <p class="promo-description">${escapeHTML(copy.description)}</p>
          <p class="promo-offer">${escapeHTML(copy.offer)}</p>
          <a class="promo-cta" href="${href}">${escapeHTML(copy.cta)} <svg class="promo-cta-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a>
        </div><div class="promo-cards">${cards.map(base => {
          const card = window.CardI18n.card(base);
          return `<button class="promo-card" data-promo-card="${escapeHTML(base.id)}" aria-label="${escapeHTML(window.CardI18n.t('view') + ' ' + card.name)}">${artwork(card)}</button>`;
        }).join('')}</div></article>`;
    }).join('');
    show(current);
  }
  function setPlaying(value) {
    playing = value;
    const button = document.getElementById('banner-play');
    button.dataset.playing = String(value);
    button.textContent = window.CardI18n.t(value ? 'pause' : 'play');
    button.setAttribute('aria-label', button.textContent);
    schedule();
  }
  document.getElementById('banner-prev').addEventListener('click', () => show(current - 1));
  document.getElementById('banner-next').addEventListener('click', () => show(current + 1));
  document.getElementById('banner-play').addEventListener('click', () => setPlaying(!playing));
  document.getElementById('language').addEventListener('change', renderPromotions);
  host.addEventListener('click', event => {
    const button = event.target.closest('[data-promo-card]');
    if (button) openDetail(button.dataset.promoCard, button);
  });
  carousel.addEventListener('mouseenter', () => { hovering = true; schedule(); });
  carousel.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  carousel.addEventListener('focusin', () => setPlaying(false));
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', event => { if (event.matches) setPlaying(false); });
  window.PromotionCarousel = { refresh: renderPromotions };
  renderPromotions(); setPlaying(playing);
})();
