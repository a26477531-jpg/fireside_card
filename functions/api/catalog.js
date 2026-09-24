import { json } from '../_lib/http.js';
import { decode } from '../_lib/catalog.js';
import { missingCatalog } from '../_lib/catalog-state.js';
export async function onRequestGet({env}) {
  let result;
  try { result=await env.DB.batch([
    env.DB.prepare("SELECT * FROM catalog_cards WHERE status='active' ORDER BY id"),
    env.DB.prepare("SELECT * FROM catalog_products WHERE status='active' ORDER BY id"),
    env.DB.prepare('SELECT COUNT(*) AS total FROM catalog_cards')
  ]); } catch(error) {
    if(missingCatalog(error)) return json({ok:true,source:'legacy',cards:[],products:[]});
    throw error;
  }
  const [cards,products,count]=result;
  if(count.results[0].total===0) return json({ok:true,source:'legacy',cards:[],products:[]});
  const ids=new Set(cards.results.map(c=>c.id));
  return json({ok:true,source:'database',cards:cards.results.map(row=>{const {translationMeta,...card}=decode(row);return card;}),products:products.results.map(decode).filter(p=>p.cardIds.every(id=>ids.has(id)))});
}
