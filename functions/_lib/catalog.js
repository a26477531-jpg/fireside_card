export const statuses = ['draft','active','archived'];
export const locales = ['zh-TW','en','ja','ko'];
const string = (v,max,optional=false) => typeof v === 'string' && v.length <= max && (optional || v.trim().length > 0);
const int = (v,max) => Number.isSafeInteger(v) && v >= 0 && v <= max;
export const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id);
function abilities(v) { return Array.isArray(v) && v.length <= 12 && v.every(a=>a && string(a.title,120) && string(a.text,3000)); }
export function translation(v) { return v && string(v.name,100) && string(v.subtitle,200,true) && abilities(v.abilities); }
function image(v) {
  if (!string(v,1000)) return false;
  if (/^[\w/-]+\.(webp|png|jpe?g)$/i.test(v) && !v.startsWith('/') && !v.includes('..')) return true;
  try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}
export function validateCard(v) {
  if (v.sourceLanguage !== undefined && !locales.includes(v.sourceLanguage)) return false;
  if (v.translationMeta !== undefined && (!v.translationMeta || Array.isArray(v.translationMeta) || typeof v.translationMeta !== 'object' || !Object.entries(v.translationMeta).every(([lang,m])=>locales.includes(lang) && m && ['machine','edited','reviewed'].includes(m.status) && string(m.source,50000) && locales.includes(m.sourceLanguage)))) return false;
  if (!v || !translation(v) || !image(v.image) || !string(v.collection,80) || !['mana','attack','health'].every(k=>int(v[k],999))) return false;
  if (v.translations !== undefined && (!v.translations || Array.isArray(v.translations) || typeof v.translations !== 'object' || !Object.entries(v.translations).every(([k,t])=>locales.includes(k) && translation(t)))) return false;
  for (const key of ['nameLayout','rulesLayout']) {
    if (v[key] !== undefined && (!v[key] || typeof v[key] !== 'object' || Array.isArray(v[key]) || !Object.entries(v[key]).every(([k,n])=>k === 'color' ? /^#[0-9a-f]{6}$/i.test(n) : typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100))) return false;
  }
  return true;
}
export function validateProduct(v) {
  return v && string(v.name,100) && Array.isArray(v.cardIds) && v.cardIds.length > 0 && v.cardIds.length <= 20 && v.cardIds.every(validId) && new Set(v.cardIds).size === v.cardIds.length &&
    int(v.coinPrice,100000000);
}
export function decode(row) { return {...JSON.parse(row.data),id:row.id,status:row.status,version:row.version,updatedAt:row.updated_at}; }
