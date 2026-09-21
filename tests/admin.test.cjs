const test=require('node:test');
const assert=require('node:assert/strict');
const {database,invoke}=require('./helpers/d1.cjs');
test('catalog: permissions, create/edit, stale writes, atomic audit, publication and coin prices',async()=>{
  const {DB,sqlite}=database();
  try {
    const cards=await import('../functions/api/admin/cards.js'),products=await import('../functions/api/admin/products.js'),catalog=await import('../functions/api/catalog.js');
    for(const handlers of [cards.onRequestGet,cards.onRequestPost,cards.onRequestPut,products.onRequestGet,products.onRequestPost,products.onRequestPut]){
      assert.equal((await invoke(handlers,DB,{token:null})).status,401);
      assert.equal((await invoke(handlers,DB,{token:'user-session'})).status,403);
    }
    const seed=(await (await invoke(cards.onRequestGet,DB)).json()).items;
    assert.equal(seed.length,31);
    const body={id:'new-card',name:'新卡',subtitle:'',collection:'新系列',image:'cards-clean-layout-31/01-murloc-chief.webp',mana:2,attack:3,health:4,abilities:[{title:'登場',text:'新增規則'}],status:'draft',translations:{}};
    const create=await invoke(cards.onRequestPost,DB,{method:'POST',body});assert.equal(create.status,201);
    assert.equal((await invoke(cards.onRequestPost,DB,{method:'POST',body})).status,409);
    assert.equal((await invoke(cards.onRequestPost,DB,{method:'POST',body:{...body,id:'bad',image:'javascript:alert(1)'}})).status,400);
    assert.equal((await invoke(cards.onRequestPost,DB,{method:'POST',body:null})).status,400);
    assert.equal((await invoke(cards.onRequestPut,DB,{method:'PUT',body,origin:'https://evil.test'})).status,403);
    let pub=await (await catalog.onRequestGet({env:{DB}})).json();assert.ok(!pub.cards.some(c=>c.id===body.id));
    let saved=(await create.json()).item;
    const active={...saved,status:'active'};
    assert.equal((await invoke(cards.onRequestPut,DB,{method:'PUT',body:active})).status,200);
    assert.equal((await invoke(cards.onRequestPut,DB,{method:'PUT',body:active})).status,409);
    assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM admin_audit').get().n,2);
    const product={id:'new-product',name:'新組合',cardIds:[body.id],coinPrice:77,status:'active'};
    assert.equal((await invoke(products.onRequestPost,DB,{method:'POST',body:{...product,coinPrice:-1}})).status,400);
    assert.equal((await invoke(products.onRequestPost,DB,{method:'POST',body:{...product,cardIds:['missing']}})).status,400);
    assert.equal((await invoke(products.onRequestPost,DB,{method:'POST',body:product})).status,201);
    pub=await (await catalog.onRequestGet({env:{DB}})).json();assert.equal(pub.products.find(p=>p.id===product.id).coinPrice,77);
    const archived={...active,status:'archived',version:2};assert.equal((await invoke(cards.onRequestPut,DB,{method:'PUT',body:archived})).status,200);
    pub=await (await catalog.onRequestGet({env:{DB}})).json();assert.ok(!pub.products.some(p=>p.id===product.id));
    // Audit failure rolls back the catalog write too.
    sqlite.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON admin_audit BEGIN SELECT RAISE(ABORT,'audit unavailable'); END;");
    await assert.rejects(invoke(cards.onRequestPost,DB,{method:'POST',body:{...body,id:'rollback'}}));
    assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM catalog_cards WHERE id='rollback'").get().n,0);
  }finally{sqlite.close();}
});
test('orders: actual SQLite filters, pagination, snapshots and authorization',async()=>{
  const {DB,sqlite}=database();try{
    const {onRequestGet}=await import('../functions/api/admin/orders.js');
    assert.equal((await invoke(onRequestGet,DB,{token:'user-session'})).status,403);
    assert.equal((await invoke(onRequestGet,DB,{token:null})).status,401);
    const insert=sqlite.prepare("INSERT INTO purchase_orders(id,user_id,player_username,player_email,product_id,product_name,currency,unit_price,quantity,total,status,created_at) VALUES (?,2,?,?,?,?, 'COIN',30,2,60,?,?)");
    for(let i=0;i<28;i++)insert.run('order-'+i,'member','member@example.test','deepsea-duo','當時的商品名稱',i===0?'cancelled':'completed','2026-09-21T10:00:00.000Z');
    insert.run('literal','percent%player','literal@example.test','deepsea-duo','快照','completed','2026-09-22T10:00:00.000Z');
    const query=async q=>(await (await invoke(onRequestGet,DB,{url:'https://cards.test/api/admin/orders?'+q})).json());
    let r=await query('player=member&status=completed&from=2026-09-21&to=2026-09-21');assert.equal(r.total,27);assert.equal(r.orders.length,25);assert.equal(r.orders[0].total,60);assert.equal(r.orders[0].product_name,'當時的商品名稱');
    r=await query('player=member&status=completed&page=2');assert.equal(r.orders.length,2);
    assert.equal((await query('player=2')).total,29);assert.equal((await query('player=%25')).total,1);assert.equal((await query('player=unknown')).total,0);
    assert.equal((await invoke(onRequestGet,DB,{url:'https://cards.test/api/admin/orders?from=2026-02-31'})).status,400);
  }finally{sqlite.close();}
});
