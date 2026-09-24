const test=require('node:test');
const assert=require('node:assert/strict');
const {database,invoke}=require('./helpers/d1.cjs');
test('unmigrated or unseeded catalogs preserve legacy cards; archived catalogs never fall back',async()=>{
  const api=await import('../functions/api/catalog.js');
  const favorites=await import('../functions/api/favorites.js');
  const {DB,sqlite}=database();
  try {
    sqlite.exec("UPDATE catalog_cards SET status='archived'");
    let data=await (await api.onRequestGet({env:{DB}})).json();assert.equal(data.source,'database');assert.equal(data.cards.length,0);
    assert.equal((await invoke(favorites.onRequestPut,DB,{method:'PUT',body:{cardId:'01'}})).status,400);
    sqlite.exec('DELETE FROM catalog_cards');
    data=await (await api.onRequestGet({env:{DB}})).json();assert.equal(data.source,'legacy');
    assert.equal((await invoke(favorites.onRequestPut,DB,{method:'PUT',body:{cardId:'01'}})).status,200);
    sqlite.exec('DROP TABLE catalog_cards; DROP TABLE catalog_products;');
    data=await (await api.onRequestGet({env:{DB}})).json();assert.equal(data.source,'legacy');
    assert.equal((await invoke(favorites.onRequestPut,DB,{method:'PUT',body:{cardId:'01'}})).status,200);
    assert.equal((await invoke(favorites.onRequestPut,DB,{method:'PUT',body:{cardId:'unknown'}})).status,400);
    await assert.rejects(api.onRequestGet({env:{DB:{prepare(){return {};},batch(){throw new Error('database unavailable');}}}}));
  }finally{sqlite.close();}
});
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
    assert.ok(r.orders.every(o=>/^ORD-\d{6,}$/.test(o.order_number)));
    assert.equal(new Set(r.orders.map(o=>o.order_number)).size,25);
    const reference=r.orders[0];
    assert.equal((await query('player=2')).orders.find(o=>o.id===reference.id).order_number,reference.order_number);
    r=await query('player=member&status=completed&page=2');assert.equal(r.orders.length,2);
    assert.equal((await query('player=2')).total,29);assert.equal((await query('player=%25')).total,1);assert.equal((await query('player=unknown')).total,0);
    assert.equal((await invoke(onRequestGet,DB,{url:'https://cards.test/api/admin/orders?from=2026-02-31'})).status,400);
  }finally{sqlite.close();}
});

test('order numbers: backfill, rerun, new orders, rollback and no reuse',()=>{
  const {sqlite}=database();
  try {
    sqlite.exec('DROP TRIGGER assign_order_number; DROP TABLE order_numbers;');
    const insert=sqlite.prepare("INSERT INTO purchase_orders(id,user_id,player_username,player_email,product_id,product_name,currency,unit_price,quantity,total,status,created_at) VALUES (?,2,'member','member@example.test','test','快照','COIN',0,1,0,'cancelled',?)");
    insert.run('later','2026-09-24T00:00:00.000Z');
    insert.run('earlier','2026-09-23T00:00:00.000Z');
    const migration=require('node:fs').readFileSync(require('node:path').join(__dirname,'../migrations/0008_order_numbers.sql'),'utf8');
    sqlite.exec(migration);
    const numbers=()=>sqlite.prepare('SELECT number,order_id FROM order_numbers ORDER BY number').all().map(r=>({...r}));
    assert.deepEqual(numbers(),[{number:1,order_id:'earlier'},{number:2,order_id:'later'}]);
    sqlite.exec(migration);
    assert.equal(numbers().length,2);
    insert.run('new','2026-09-24T00:00:00.000Z');
    assert.equal(numbers()[2].number,3);
    sqlite.exec("DELETE FROM purchase_orders WHERE id='new'");
    insert.run('next','2026-09-24T00:00:00.000Z');
    assert.equal(numbers().at(-1).number,4);
    sqlite.exec('BEGIN');
    insert.run('rollback','2026-09-24T00:00:00.000Z');
    sqlite.exec('ROLLBACK');
    assert.ok(!numbers().some(r=>r.order_id==='rollback'));
  }finally{sqlite.close();}
});
