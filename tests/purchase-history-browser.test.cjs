const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {database}=require('./helpers/d1.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const {DB,sqlite}=database();
  const routes={};
  for(const name of ['me','purchases'])routes['/api/'+name]=await import('../functions/api/'+name+'.js');
  const root=path.resolve(__dirname,'..');
  const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp'};
  const server=http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://127.0.0.1');
      if(routes[url.pathname]){
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined});
        const fn=routes[url.pathname]['onRequest'+({GET:'Get',POST:'Post',PUT:'Put',DELETE:'Delete'})[req.method]];
        if(!fn){res.writeHead(405).end();return;}
        const handlers=Array.isArray(fn)?fn:[fn];let i=0;
        const context={request,env:{DB},data:{},next:()=>handlers[++i](context)};
        const response=await handlers[0](context);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
      }
      const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(root+path.sep)||!types[path.extname(file)]||!fs.existsSync(file)){res.writeHead(404).end();return;}
      res.writeHead(200,{'Content-Type':types[path.extname(file)]});res.end(fs.readFileSync(file));
    }catch(e){res.writeHead(500,{'Content-Type':'application/json'}).end(JSON.stringify({ok:false,error:e.message}));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL});
  try {
    sqlite.exec("INSERT INTO purchase_orders(id,user_id,player_username,player_email,product_id,product_name,currency,unit_price,quantity,total,status,cards_snapshot) VALUES ('history-test',2,'member','member@example.test','pack','Test <pack>','COIN',30,1,30,'completed','[{\"id\":\"25\",\"name\":\"Card <one>\"}]')");
    const context=await browser.newContext();
    await context.addCookies([{name:'fireside_session',value:'user-session',url:base}]);
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/purchases.html');await page.waitForSelector('.history-order');
    assert.equal(await page.locator('.history-order h2').textContent(),'Test <pack>');
    assert.equal(await page.locator('#nav-purchases').getAttribute('aria-current'),'page');
    await page.locator('summary').click();assert.equal(await page.locator('.history-order li').textContent(),'Card <one>');
    for(const lang of ['en','ja','ko','zh-TW']){await page.locator('#language').selectOption(lang);assert.ok(await page.locator('#history-title').textContent());}
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(process.env.PURCHASE_HISTORY_SCREENSHOT)await page.screenshot({path:process.env.PURCHASE_HISTORY_SCREENSHOT,fullPage:true});
    const insert=sqlite.prepare("INSERT INTO purchase_orders(id,user_id,player_username,player_email,product_id,product_name,currency,unit_price,quantity,total,status,created_at) VALUES (?,2,'member','member@example.test','legacy','Older pack','COIN',10,1,10,'completed','2020-01-01T00:00:00.000Z')");
    for(let n=0;n<25;n++)insert.run('older-'+n);
    await page.locator('#history-reload').click();await page.waitForFunction(()=>document.querySelectorAll('.history-order').length===25);
    await page.locator('#history-next').click();await page.waitForFunction(()=>document.getElementById('history-page').textContent.includes('2 / 2'));
    assert.equal(await page.locator('.history-order').count(),1);
    assert.ok(await page.locator('#history-next').isDisabled());
    await page.locator('summary').click();assert.ok(await page.locator('details p').isVisible());
    await page.locator('#history-previous').click();await page.waitForFunction(()=>document.querySelectorAll('.history-order').length===25);
    await page.route('**/api/purchases?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
    await page.locator('#history-reload').click();await page.waitForFunction(()=>document.getElementById('history-status').textContent.includes('暫時'));
    assert.equal(await page.locator('.history-order').count(),0);
    await page.unroute('**/api/purchases?*');await context.clearCookies();
    await page.locator('#history-reload').click();await page.waitForSelector('#history-login:visible');
    assert.equal(await page.locator('.history-order').count(),0);
    await context.addCookies([{name:'fireside_session',value:'admin-session',url:base}]);
    await page.locator('#history-reload').click();await page.waitForFunction(()=>document.getElementById('history-status').textContent.includes('尚無'));
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS purchase history browser: snapshot text escaping, navigation, four languages, mobile width, retry, expired session and empty state.');
  } finally {await browser.close();server.close();sqlite.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
