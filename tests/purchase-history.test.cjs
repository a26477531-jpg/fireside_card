const assert=require('node:assert/strict');
const {database,invoke}=require('./helpers/d1.cjs');
(async()=>{
  const {DB,sqlite}=database();
  const {onRequestGet:history,onRequestPost:purchase}=await import('../functions/api/purchases.js');
  const get=(query='',token='user-session')=>invoke(history,DB,{url:'https://cards.test/api/purchases'+query,token});
  try {
    assert.equal((await get('',null)).status,401);
    assert.equal((await get('','invalid-session')).status,401);
    assert.equal((await (await get()).json()).total,0);
    for(const page of ['0','-1','1.5','NaN','100001'])assert.equal((await get('?page='+page)).status,400);
    const bought=await invoke(purchase,DB,{method:'POST',token:'user-session',body:{productId:'deepsea-duo',expectedPrice:30,productVersion:1,requestId:crypto.randomUUID()}});
    assert.equal(bought.status,200);
    const first=await (await get()).json();
    assert.equal(first.total,1);assert.equal(first.orders[0].total,30);
    assert.match(first.orders[0].orderNumber,/^ORD-\d{6}$/);assert.equal(first.orders[0].cards.length,2);
    assert.deepEqual(Object.keys(first.orders[0]).sort(),['orderNumber','productName','currency','unitPrice','quantity','total','status','createdAt','cards'].sort());
    sqlite.exec("UPDATE catalog_products SET data=json_set(data,'$.name','changed'),status='archived'; UPDATE catalog_cards SET data=json_set(data,'$.name','changed'),status='archived';");
    assert.deepEqual((await (await get()).json()).orders,first.orders);
    assert.equal((await (await get('?user_id=1&player=administrator')).json()).total,1);
    assert.equal((await (await get('?user_id=2','admin-session')).json()).total,0);
    const insert=sqlite.prepare("INSERT INTO purchase_orders(id,user_id,player_username,player_email,product_id,product_name,currency,unit_price,quantity,total,status,created_at) VALUES (?,2,'member','member@example.test','old','Old pack','COIN',10,1,10,'completed','2020-01-01T00:00:00.000Z')");
    for(let n=0;n<30;n++)insert.run('old-'+String(n).padStart(2,'0'));
    const page1=await (await get()).json(),page2=await (await get('?page=2')).json();
    assert.equal(page1.total,31);assert.equal(page1.orders.length,25);assert.equal(page2.orders.length,6);
    assert.equal(page1.orders[0].orderNumber,first.orders[0].orderNumber);
    assert.equal(new Set([...page1.orders,...page2.orders].map(o=>o.orderNumber)).size,31);
    assert.equal(page2.orders[0].cards,null);
    assert.equal((await (await get('?page=3')).json()).orders.length,0);
    assert.equal((await get()).headers.get('Cache-Control'),'no-store');
    sqlite.exec('DROP TABLE order_numbers');assert.equal((await get()).status,503);
    console.log('PASS purchase history: authentication, user isolation, snapshot preservation, pagination, legacy orders, private projection and unavailable schema.');
  }finally{sqlite.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
