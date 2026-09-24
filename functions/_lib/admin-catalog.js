import { json } from './http.js';
import { authenticate, requirePermission } from './middleware.js';
import { decode, statuses, validId, validateCard, validateProduct } from './catalog.js';
import { translationState, languages, fingerprint } from '../../translation-workflow.js';
export function catalogHandlers(kind) {
  const table = kind === 'card' ? 'catalog_cards' : 'catalog_products';
  async function list({env}) {
    const {results} = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY updated_at DESC, id`).all();
    return json({ok:true,items:results.map(decode)});
  }
  function save(create) {
    return async ({request,env,data}) => {
      if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return json({ok:false,error:'forbidden'},{status:403});
      let body;
      try { const raw = await request.text(); if(raw.length > 250000) throw new Error(); body=JSON.parse(raw); } catch { return json({ok:false,error:'invalid-body'},{status:400}); }
      if (!body || !validId(body.id) || !statuses.includes(body.status) || !(kind === 'card' ? validateCard(body) : validateProduct(body))) return json({ok:false,error:'validation-failed'},{status:400});
      const target = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(body.id).first();
      if(create && target) return json({ok:false,error:'duplicate-id'},{status:409});
      if(!create && !target) return json({ok:false,error:'not-found'},{status:404});
      if(!create && body.version !== target.version) return json({ok:false,error:'version-conflict'},{status:409});
      if(kind === 'card') {
        const previous=target?decode(target):null;
        if(previous?.sourceLanguage && body.sourceLanguage!==previous.sourceLanguage) return json({ok:false,error:'validation-failed'},{status:400});
        body.sourceLanguage ||= previous?.sourceLanguage || 'zh-TW';
        body.translationMeta ||= {};
        for(const lang of Object.keys(body.translations||{})) {
          if(lang===(body.sourceLanguage||'zh-TW'))continue;
          if(!body.translationMeta[lang]) body.translationMeta[lang]=previous?.translationMeta?.[lang] || {status:previous?.translations?.[lang]?'reviewed':'edited',source:fingerprint(previous||body),sourceLanguage:previous?.sourceLanguage||body.sourceLanguage||'zh-TW'};
        }
      }
      if (kind === 'product') {
        for (const id of body.cardIds) {
          const card = await env.DB.prepare('SELECT status FROM catalog_cards WHERE id = ?').bind(id).first();
          if (!card || (body.status === 'active' && card.status !== 'active')) return json({ok:false,error:'invalid-product-card'},{status:400});
        }
      }
      // Persist only catalog fields, never request-provided actor/session metadata.
      if(kind === 'card' && body.status === 'active' && body.sourceLanguage && languages.some(l=>l!==body.sourceLanguage && translationState(body,l)!=='reviewed')) return json({ok:false,error:'translation-review-required'},{status:400});
      const keys = kind === 'card' ? ['name','subtitle','image','collection','mana','attack','health','abilities','translations','sourceLanguage','translationMeta','nameLayout','rulesLayout'] : ['name','cardIds','coinPrice'];
      const clean = Object.fromEntries(keys.filter(k=>body[k] !== undefined).map(k=>[k,body[k]]));
      if(kind === 'card') {clean.translations ||= {};clean.translations[clean.sourceLanguage||'zh-TW']={name:clean.name,subtitle:clean.subtitle,abilities:clean.abilities};}
      const encoded=JSON.stringify(clean);
      const write=create ? env.DB.prepare(`INSERT INTO ${table}(id,data,status) VALUES (?,?,?)`).bind(body.id,encoded,body.status) : env.DB.prepare(`UPDATE ${table} SET data=?, status=?, version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND version=?`).bind(encoded,body.status,body.id,body.version);
      const audit=env.DB.prepare("INSERT INTO admin_audit(actor_id,entity,entity_id,action,before_data,after_data) SELECT ?,?,?,?,?,? WHERE changes() > 0").bind(data.user.id,kind,body.id,create?'create':'update',target?JSON.stringify(decode(target)):null,JSON.stringify({...clean,status:body.status}));
      try {
        const results=await env.DB.batch([write,audit]);
        if(!results[0].meta.changes) return json({ok:false,error:'version-conflict'},{status:409});
      } catch(error) {
        if(String(error.message).includes('UNIQUE')) return json({ok:false,error:'duplicate-id'},{status:409});
        throw error;
      }
      return json({ok:true,item:decode(await env.DB.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(body.id).first())},{status:create?201:200});
    };
  }
  return {get:[authenticate,requirePermission(`${kind}.view`),list],post:[authenticate,requirePermission(`${kind}.create`),save(true)],put:[authenticate,requirePermission(`${kind}.edit`),save(false)]};
}
