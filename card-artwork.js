// 首頁與商城共用的卡牌圖像與文字排版。
'use strict';
(() => {
  const I18n = window.CardI18n;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function artwork(card, detail = false) {
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

  window.artwork = artwork;
})();
