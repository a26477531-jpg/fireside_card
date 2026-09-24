export const languages = ['zh-TW', 'en', 'ja', 'ko'];
export const content = v => ({name:v.name, subtitle:v.subtitle ?? '', abilities:(v.abilities ?? []).map(a=>({title:a.title,text:a.text}))});
export const fingerprint = v => JSON.stringify(content(v));
export function translationState(card, lang) {
  if (!card.translations?.[lang]) return 'missing';
  const meta=card.translationMeta?.[lang];
  if (!meta) return 'reviewed'; // Existing manually maintained catalog.
  if (meta.source !== fingerprint(card) || meta.sourceLanguage !== (card.sourceLanguage || 'zh-TW')) return 'stale';
  return meta.status;
}
