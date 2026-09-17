const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless:true, channel:'msedge' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.emulateMedia({ reducedMotion:'reduce' });
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height:1100 });
      for (const language of ['zh-TW','en','ja','ko']) {
        await page.selectOption('#language', language);
        for (let index=0;index<3;index++) {
          await page.waitForTimeout(80);
          const result = await page.evaluate(() => {
            const slide=document.querySelector('.promo-slide:not([hidden])');
            const index=[...slide.parentNode.children].indexOf(slide);
            const promo=window.PROMOTIONS[index];
            const cards=promo.cardIds.map(id=>window.CardI18n.card(window.CARDS.find(c=>c.id===id)));
            const art=[...slide.querySelectorAll('.card-art')];
            return {
              headline:slide.querySelector('h2').textContent,
              expected:promo.copy[window.CardI18n.language].title,
              complete:cards.every((card,i)=>art[i].querySelector('.card-name').textContent===card.name && card.abilities.every(a=>art[i].textContent.includes(a.title)&&art[i].textContent.includes(a.text))),
              blankImages:art.every(el=>el.querySelector('img').getAttribute('src').startsWith('cards-clean-layout-31/')),
              fit:art.every(el=>[...el.querySelectorAll('[data-text-fits]')].length===2 && [...el.querySelectorAll('[data-text-fits]')].every(t=>t.dataset.textFits==='true')),
              overflow:document.documentElement.scrollWidth>innerWidth
            };
          });
          assert.equal(result.headline,result.expected);
          assert.ok(result.complete && result.blankImages && result.fit && !result.overflow,JSON.stringify({width,language,index,result}));
          await page.locator('#banner-next').click();
        }
      }
    }
    await page.selectOption('#language','zh-TW');
    await page.evaluate(() => {
      window.PROMOTIONS[0].copy['zh-TW'].title='維護測試標題';
      window.CARD_TRANSLATIONS['25']['zh-TW'].abilities[0].text='測試規則：造成 7 點傷害。';
      window.PromotionCarousel.refresh();
    });
    assert.equal(await page.locator('.promo-slide:not([hidden]) h2').innerText(),'維護測試標題');
    assert.ok((await page.locator('.promo-slide:not([hidden])').innerText()).includes('測試規則：造成 7 點傷害。'));
    await page.reload();
    await page.setViewportSize({width:1440,height:1100});
    await page.waitForTimeout(200);
    await page.screenshot({path:path.resolve(__dirname,'../banner/layered-preview.png')});
    assert.deepEqual(errors,[]);
    console.log('Passed: 3 promotions × 4 languages × 3 widths; complete rules; blank card images; text fit; live data edits; navigation; no page errors.');
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error); process.exit(1); });
