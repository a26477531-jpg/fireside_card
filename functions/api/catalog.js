import { json } from '../_lib/http.js';
import { decode } from '../_lib/catalog.js';
export async function onRequestGet({env}) {
  const [cards,products]=await env.DB.batch([
    env.DB.prepare("SELECT * FROM catalog_cards WHERE status='active' ORDER BY id"),
    env.DB.prepare("SELECT * FROM catalog_products WHERE status='active' ORDER BY id")
  ]);
  const ids=new Set(cards.results.map(c=>c.id));
  return json({ok:true,cards:cards.results.map(decode),products:products.results.map(decode).filter(p=>p.cardIds.every(id=>ids.has(id)))});
}
