import { authenticate } from '../_lib/middleware.js';
import { json } from '../_lib/http.js';
async function list({env,data}) {
  try {
    const {results}=await env.DB.prepare('SELECT card_id,quantity,card_data,acquired_at FROM user_cards WHERE user_id=?1 ORDER BY acquired_at DESC,card_id').bind(data.user.id).all();
    return json({ok:true,cards:results.map(row=>({card:{...JSON.parse(row.card_data),id:row.card_id},quantity:row.quantity,acquiredAt:row.acquired_at}))});
  } catch(error) {
    if(/no such table/i.test(error.message))return json({ok:false,error:'purchase-not-ready'},{status:503});
    throw error;
  }
}
export const onRequestGet=[authenticate,list];
