const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {chromium}=require('playwright');
test('recovery forms on mobile, language switching, mismatch and cleared token',async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const requests=[];
 await page.route('https://cards.test/**',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname.startsWith('/api/')){if(url.pathname.includes('password'))requests.push(route.request().postDataJSON());await route.fulfill({json:url.pathname==='/api/me'?{ok:false}:{ok:true}});return;}
 const file=path.join(__dirname,'..',url.pathname);await route.fulfill({body:fs.readFileSync(file),contentType:url.pathname.endsWith('.js')?'application/javascript':url.pathname.endsWith('.css')?'text/css':'text/html'});
 });
 await page.goto('https://cards.test/login.html');await page.locator('#forgot-password-link').click();
 await page.locator('#recovery-input').fill('member@example.test');await page.locator('#recovery-submit').click();await page.waitForFunction(()=>document.getElementById('recovery-message').textContent.includes('若此'));
 assert.equal(requests[0].email,'member@example.test');await page.selectOption('#language','en');assert.match(await page.locator('#recovery-message').textContent(),/If this email/);
 await page.goto('https://cards.test/reset-password.html#token='+ 'a'.repeat(43));assert.equal(new URL(page.url()).hash,'');
 await page.locator('#recovery-input').fill('NewPassword123');await page.locator('#confirm-password').fill('Different123');await page.locator('#recovery-submit').click();assert.match(await page.locator('#recovery-message').textContent(),/do not match/);
 await page.locator('#confirm-password').fill('NewPassword123');await page.locator('#recovery-submit').click();await page.waitForFunction(()=>document.getElementById('recovery-message').textContent.includes('Password updated'));
 assert.equal(requests[1].token,'a'.repeat(43));assert.ok(await page.locator('#recovery-submit').isDisabled());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
