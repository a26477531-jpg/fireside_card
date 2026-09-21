import { authenticate } from '../_lib/middleware.js';
import { json } from '../_lib/http.js';
import { validId } from '../_lib/catalog.js';
import { cardIds } from '../_lib/card-ids.js';
import { missingCatalog } from '../_lib/catalog-state.js';
async function list({env,data}) {
  const {results} = await env.DB.prepare('SELECT card_id FROM favorites WHERE user_id = ?1 ORDER BY id').bind(data.user.id).all();
  return json({ok:true, cardIds:results.map(row=>row.card_id)});
}
function change(remove) {
  return async ({request,env,data}) => {
    if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return json({ok:false,error:'forbidden'},{status:403});
    let body;
    try { body = await request.json(); } catch { return json({ok:false,error:'invalid-body'},{status:400}); }
    if (!body || !validId(body.cardId)) return json({ok:false,error:'invalid-card'},{status:400});
    if (!remove) {
      let allowed=false;
      try {
        const card=await env.DB.prepare("SELECT id FROM catalog_cards WHERE id=? AND status='active'").bind(body.cardId).first();
        allowed=Boolean(card);
        if(!allowed && cardIds.has(body.cardId)) {
          const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM catalog_cards').first();
          allowed=count.total===0;
        }
      } catch(error) {if(!missingCatalog(error))throw error;allowed=cardIds.has(body.cardId);}
      if(!allowed)return json({ok:false,error:'invalid-card'},{status:400});
    }
    const sql = remove ? 'DELETE FROM favorites WHERE user_id = ?1 AND card_id = ?2' : 'INSERT INTO favorites (user_id, card_id) VALUES (?1, ?2) ON CONFLICT(user_id, card_id) DO NOTHING';
    await env.DB.prepare(sql).bind(data.user.id,body.cardId).run();
    return json({ok:true,cardId:body.cardId,favorite:!remove});
  };
}
export const onRequestGet = [authenticate,list];
export const onRequestPut = [authenticate,change(false)];
export const onRequestDelete = [authenticate,change(true)];
