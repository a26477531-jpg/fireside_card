const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {chromium}=require('playwright');
test('Google controls support login, linking, unavailable config and mobile languages',async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];const intents=[];
  page.on('pageerror',e=>errors.push(e.message));let user=null;let enabled=true;let linkedEmail=null;
  await page.route('https://cards.test/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')){
    if(url.pathname==='/api/google/start'){intents.push(route.request().postDataJSON().intent);await route.fulfill({status:409,json:{ok:false,error:'session-changed'}});return;}
    await route.fulfill({json:url.pathname==='/api/me'?{ok:true,user}:{ok:true,enabled,linkedEmail}});return;
   }
   const file=path.join(__dirname,'..',url.pathname);await route.fulfill({body:fs.readFileSync(file),contentType:url.pathname.endsWith('.js')?'application/javascript':url.pathname.endsWith('.css')?'text/css':'text/html'});
  });
  await page.goto('https://cards.test/login.html?google=existing-account');
  await page.locator('.google-action:not([disabled])').waitFor();
  assert.ok(!page.url().includes('google='));
  assert.match(await page.locator('.google-account-panel .form-message').textContent(),/原帳密/);
  await page.locator('.google-action').click();await page.waitForFunction(()=>!document.querySelector('.google-action').disabled);assert.deepEqual(intents,['login']);
  await page.selectOption('#language','en');assert.match(await page.locator('.google-action').textContent(),/Sign in/);
  user={id:2,username:'member',coinBalance:123,role:'user'};
  await page.evaluate(()=>window.FiresideAccount.refresh());
  await page.waitForFunction(()=>document.querySelector('.google-action').textContent.includes('Link'));
  assert.equal(await page.locator('#nav-account').getAttribute('href'),'login.html');
  await page.locator('.google-action').click();await page.waitForFunction(()=>!document.querySelector('.google-action').disabled);assert.deepEqual(intents,['login','link']);
  linkedEmail='member@example.test';
  await page.evaluate(()=>window.FiresideAccount.refresh());
  await page.locator('.google-action').waitFor({state:'hidden'});
  assert.match(await page.locator('.google-description').textContent(),/member@example.test/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'output/google-linked-mobile.png',fullPage:true});
  user=null;enabled=false;linkedEmail=null;
  await page.goto('https://cards.test/register.html');
  await page.waitForFunction(()=>document.querySelector('.google-account-panel .form-message').textContent.includes('unavailable'));
  assert.ok(await page.locator('.google-action').isDisabled());
  assert.ok(await page.locator('#register-form').isVisible());
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

