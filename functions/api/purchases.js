import { authenticate } from '../_lib/middleware.js';
import { json } from '../_lib/http.js';
import { validId } from '../_lib/catalog.js';

async function purchase({request,env,data}) {
  if(request.headers.get('Origin') && request.headers.get('Origin')!==new URL(request.url).origin)
    return json({ok:false,error:'forbidden'},{status:403});
  let body;
  try {body=await request.json();} catch {return json({ok:false,error:'invalid-body'},{status:400});}
  if(!body || !validId(body.productId) || typeof body.requestId!=='string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId) ||
    !Number.isSafeInteger(body.expectedPrice) || body.expectedPrice<0 ||
    !Number.isSafeInteger(body.productVersion) || body.productVersion<1)
    return json({ok:false,error:'invalid-body'},{status:400});
  const user=data.user;
  try {
    // Read product, price and card snapshots in the INSERT itself, so an admin
    // edit or concurrent checkout cannot race a stale application-side read.
    const result=await env.DB.batch([
      env.DB.prepare(`INSERT INTO purchase_orders
        (id,user_id,player_username,player_email,product_id,product_name,currency,unit_price,quantity,total,status,idempotency_key,cards_snapshot)
        SELECT ?1,?2,?3,?4,p.id,json_extract(p.data,'$.name'),'COIN',
          json_extract(p.data,'$.coinPrice'),1,json_extract(p.data,'$.coinPrice'),'completed',?5,
          (SELECT json_group_array(json_patch(c.data,json_object('id',c.id)))
            FROM json_each(p.data,'$.cardIds') item JOIN catalog_cards c ON c.id=item.value)
        FROM catalog_products p WHERE p.id=?6 AND p.status='active' AND p.version=?7
          AND json_extract(p.data,'$.coinPrice')=?8
          AND json_array_length(p.data,'$.cardIds')>0
          AND NOT EXISTS(SELECT 1 FROM json_each(p.data,'$.cardIds') item
            LEFT JOIN catalog_cards c ON c.id=item.value WHERE c.id IS NULL OR c.status!='active')
          AND NOT EXISTS(SELECT 1 FROM purchase_orders WHERE user_id=?2 AND idempotency_key=?5)`)
        .bind(crypto.randomUUID(),user.id,user.username,user.email,body.requestId,body.productId,body.productVersion,body.expectedPrice),
      env.DB.prepare('SELECT id,product_id,total,cards_snapshot FROM purchase_orders WHERE user_id=?1 AND idempotency_key=?2').bind(user.id,body.requestId),
      env.DB.prepare('SELECT coin_balance FROM users WHERE id=?1').bind(user.id)
    ]);
    const order=result[1].results[0];
    if(!order)return json({ok:false,error:'product-changed'},{status:409});
    if(order.product_id!==body.productId)return json({ok:false,error:'request-conflict'},{status:409});
    return json({ok:true,orderId:order.id,total:order.total,coinBalance:result[2].results[0].coin_balance,
      cardIds:JSON.parse(order.cards_snapshot).map(c=>c.id)});
  } catch(error) {
    if(String(error.message).includes('insufficient-coins'))return json({ok:false,error:'insufficient-coins'},{status:409});
    if(/no such (table|column)|has no column/i.test(error.message))return json({ok:false,error:'purchase-not-ready'},{status:503});
    throw error;
  }
}
export const onRequestPost=[authenticate,purchase];
