import { authenticate, requirePermission } from '../../_lib/middleware.js';
import { json } from '../../_lib/http.js';
async function list({request,env}) {
  const p=new URL(request.url).searchParams;
  const player=(p.get('player')||'').trim(), status=p.get('status')||'', from=p.get('from')||'', to=p.get('to')||'';
  const page=Number(p.get('page')||1);
  const validDate=v=>!v || /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v;
  if(player.length>254 || !Number.isSafeInteger(page) || page<1 || page>100000 || !validDate(from) || !validDate(to) || (from && to && from>to) || (status && !['pending','completed','cancelled','refunded'].includes(status))) return json({ok:false,error:'validation-failed'},{status:400});
  const where=[], args=[];
  if(player) {where.push('(CAST(user_id AS TEXT)=? OR player_username LIKE ? ESCAPE \'\\\' OR player_email LIKE ? ESCAPE \'\\\')'); const like='%'+player.replace(/[\\%_]/g,'\\$&')+'%';args.push(player,like,like);}
  if(status){where.push('status=?');args.push(status);}
  if(from){where.push('created_at>=?');args.push(from+'T00:00:00.000Z');}
  if(to){where.push('created_at<?');args.push(new Date(Date.parse(to)+86400000).toISOString());}
  const clause=where.length?' WHERE '+where.join(' AND '):'';
  const result=await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS total FROM purchase_orders'+clause).bind(...args),
    env.DB.prepare("SELECT *, (SELECT printf('ORD-%06d', number) FROM order_numbers WHERE order_id=purchase_orders.id) AS order_number FROM purchase_orders"+clause+' ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?').bind(...args,(page-1)*25)
  ]);
  return json({ok:true,total:result[0].results[0].total,page,pageSize:25,orders:result[1].results});
}
export const onRequestGet=[authenticate,requirePermission('order.view'),list];
