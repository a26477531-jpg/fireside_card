// 首頁與商城共用的卡牌圖像與文字排版。
'use strict';
(() => {
  const I18n = window.CardI18n;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function renderArtwork(card, detail = false) {
  const template = window.CardTemplate;
  const imagePath = template?.images[card.image] || card.image;
  const uniform = Boolean(template && (template.images[card.image] || imagePath.startsWith('cards-unified-31/')));
  if (uniform) {
    const box = region => {
      const r=template[region],c=template.canvas;
      return `left:${r.x/c.width*100}%;top:${r.y/c.height*100}%;width:${r.width/c.width*100}%;height:${r.height/c.height*100}%;font-size:${r.fontSize/c.width*100}cqw`;
    };
    const rules=(card.rulesText || card.abilities.map(a=>`${a.title}\n${a.text}`).join('\n\n')).trim();
    const blocks=rules.split(/\n\s*\n/).map(rule=>{const [title,...lines]=rule.split('\n');return `<span class="rule-block"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(lines.join('\n'))}</span></span>`;}).join('');
    const stats=['mana','attack','health'].map(key=>`<span class="card-stat card-stat-${key}" data-region="${key}" style="${box(key)}" aria-label="${escapeHTML(I18n.t(key))} ${escapeHTML(card[key])}">${escapeHTML(card[key])}</span>`).join('');
    return `<div class="card-art card-template ${detail?'detail-art':''}" data-template="${template.version}" lang="${card.language||I18n.language}"><img src="${escapeHTML(imagePath)}" alt="${escapeHTML(card.name)}" width="1024" height="1536" ${detail?'':'loading="lazy"'}>${stats}<span class="card-name" data-region="name" style="${box('name')}">${escapeHTML(card.name)}</span><span class="card-ability" data-region="rules" style="${box('rules')};--rules-notch:${template.rules.notchStart}%;--rules-inset:${template.rules.sideInset}%"><span class="rules-exclusion left" aria-hidden="true"></span><span class="rules-exclusion right" aria-hidden="true"></span>${blocks}</span></div>`;
  }
  const layout = card.nameLayout || {};
  const bounded = (value, fallback, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  const nameStyle = `--name-x:${bounded(layout.centerX,50,0,100)}%;--name-y:${bounded(layout.centerY,57.3,0,100)}%;--name-width:${bounded(layout.width,74,1,100)}%;--name-height:${bounded(layout.height,6,1,20)}%;--name-font:${bounded(layout.fontSize,6,1,10)}cqw;--name-color:${/^#[0-9a-f]{6}$/i.test(layout.color || '') ? layout.color : '#f8e8b9'}`;
  const rules = card.rulesLayout || {};
  const rulesStyle = `--rules-top:${bounded(rules.top,64,0,100)}%;--rules-height:${bounded(rules.height,23,1,40)}%;--rules-notch:${bounded(rules.notchStart,55,0,100)}%;--rules-inset:${bounded(rules.sideInset,24,0,40)}%`;
  return `<div class="card-art ${detail ? 'detail-art' : ''}" lang="${card.language || I18n.language}"><img src="${escapeHTML(card.image)}" alt="${escapeHTML(card.name)}" width="1024" height="1536" ${detail ? '' : 'loading="lazy"'}><span class="card-name" style="${nameStyle}">${escapeHTML(card.name)}</span><span class="card-ability" style="${rulesStyle}"><span class="rules-exclusion left" aria-hidden="true"></span><span class="rules-exclusion right" aria-hidden="true"></span>${(card.rulesText || card.abilities.map(a => `${a.title}\n${a.text}`).join('\n\n')).trim().split(/\n\s*\n/).map(rule => { const [title, ...lines] = rule.split('\n'); return `<span class="rule-block"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(lines.join('\n'))}</span></span>`; }).join('')}</span></div>`;
}

  const labels = {
    'zh-TW': ['拖曳或使用方向鍵轉動卡牌', '回正'],
    en: ['Drag or use arrow keys to rotate the card', 'Reset'],
    ja: ['ドラッグまたは矢印キーで回転', 'リセット'],
    ko: ['드래그하거나 방향키로 회전', '초기화']
  };
  window.artwork = (card, detail = false) => {
    const html = renderArtwork(card, detail);
    const split = html.indexOf('>') + 1;
    const [hint, reset] = labels[I18n.language] || labels.en;
    return html.slice(0, split) + `<div class="card-face" ${detail ? `tabindex="0" role="group" aria-label="${escapeHTML(card.name + ' — ' + hint)}"` : ''}>` +
      html.slice(split, -6) + '<span class="card-sheen" aria-hidden="true"></span></div>' +
      (detail ? `<div class="card-angle-tools"><span>${hint}</span><button type="button" data-card-reset>${reset}</button></div>` : '') + '</div>';
  };

  // Delegation also handles cards inserted by catalog fetches, filters and dialogs.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const angles = new WeakMap();
  let drag;
  const clamp = value => Math.max(-28, Math.min(28, value));
  function rotate(art, x = 0, y = 0) {
    angles.set(art, {x: clamp(x), y: clamp(y)});
    art.style.setProperty('--tilt-x', clamp(x) + 'deg');
    art.style.setProperty('--tilt-y', clamp(y) + 'deg');
    art.style.setProperty('--shine-x', (50 + y * 1.3) + '%');
    art.style.setProperty('--shine-y', (50 - x * 1.3) + '%');
    art.classList.toggle('is-tilted', Boolean(x || y));
  }
  document.addEventListener('pointerdown', event => {
    const face = event.target.closest('.detail-art .card-face');
    if (!face || event.button !== 0 || !event.isPrimary) return;
    const art = face.closest('.card-art');
    drag = {art, face, id: event.pointerId, startX: event.clientX, startY: event.clientY, ...(angles.get(art) || {x:0,y:0})};
    face.setPointerCapture(event.pointerId);
    art.classList.add('is-dragging');
    face.focus({preventScroll:true});
    event.preventDefault();
  });
  document.addEventListener('pointermove', event => {
    if (drag && event.pointerId === drag.id) {
      rotate(drag.art, drag.x - (event.clientY-drag.startY)*.16, drag.y + (event.clientX-drag.startX)*.16);
      return;
    }
    const art = event.target.closest('.card-art');
    if (!art || art.classList.contains('detail-art') || event.pointerType !== 'mouse' || reduced.matches) return;
    const rect = art.getBoundingClientRect();
    rotate(art, (0.5-(event.clientY-rect.top)/rect.height)*20, ((event.clientX-rect.left)/rect.width-0.5)*24);
  });
  document.addEventListener('pointerout', event => {
    const art = event.target.closest('.card-art');
    if (art && !art.classList.contains('detail-art') && !art.contains(event.relatedTarget)) rotate(art);
  });
  function endDrag(event) {
    if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.id)) return;
    const current = drag;
    drag = null;
    current.art.classList.remove('is-dragging');
    if (current.face.hasPointerCapture(current.id)) current.face.releasePointerCapture(current.id);
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(type, endDrag);
  window.addEventListener('blur', () => endDrag());
  document.addEventListener('close', () => endDrag(), true);
  document.addEventListener('click', event => {
    const reset = event.target.closest('[data-card-reset]');
    if (reset) rotate(reset.closest('.card-art'));
  });
  document.addEventListener('keydown', event => {
    if (!event.target.matches('.detail-art .card-face')) return;
    const art = event.target.closest('.card-art');
    const {x,y} = angles.get(art) || {x:0,y:0};
    const next = {ArrowLeft:[x,y-5],ArrowRight:[x,y+5],ArrowUp:[x+5,y],ArrowDown:[x-5,y],Home:[0,0]}[event.key];
    if (next) { event.preventDefault(); rotate(art, ...next); }
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) document.querySelectorAll('.card-art:not(.detail-art)').forEach(art => rotate(art));
  });
})();
