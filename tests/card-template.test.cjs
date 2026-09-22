const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1360,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    // Test fixture stays in memory; no additional public page is needed.
    await page.setContent('<main id="preview" style="display:flex;flex-wrap:wrap;gap:24px"></main>');
    for(const file of ['index.css','card-template.css'])await page.addStyleTag({path:path.resolve(file)});
    await page.addStyleTag({content:'.sample{width:var(--preview-width,300px)}'});
    for(const file of ['cards-data.js','translations-data.js','i18n.js','card-template.js','card-artwork.js','card-text-fit.js'])await page.addScriptTag({path:path.resolve(file)});
    await page.evaluate(()=>document.fonts.ready);
    let cases=0;
    for(const lang of ['zh-TW','en','ja','ko'])for(const width of [84,180,300,450])for(const stress of [false,true]){
      const result=await page.evaluate(({lang,width,stress})=>{
        CardI18n.setLanguage(lang);
        document.documentElement.style.setProperty('--preview-width',width+'px');
        document.querySelector('#preview').innerHTML=CARDS.map(source=>{
          const card=CardI18n.card(source);
          if(stress)Object.assign(card,{mana:999,attack:999,health:999});
          return `<section class="sample" data-card-id="${source.id}">${artwork(card,true)}</section>`;
        }).join('');
        CardTextFit.fit(document);
        const failures=[];
        for(const art of document.querySelectorAll('.card-art')){
          const parent=art.getBoundingClientRect();
          for(const el of art.querySelectorAll('[data-region]')){
            const r=el.getBoundingClientRect(), expected=CardTemplate[el.dataset.region];
            if(el.dataset.textFits!=='true')failures.push(`${art.parentElement.dataset.cardId} ${el.dataset.region} overflow`);
            for(const [actual,want] of [[r.left-parent.left,expected.x/1024*parent.width],[r.top-parent.top,expected.y/1536*parent.height],[r.width,expected.width/1024*parent.width],[r.height,expected.height/1536*parent.height]]){
              if(Math.abs(actual-want)>.1)failures.push(`${art.parentElement.dataset.cardId} ${el.dataset.region} geometry`);
            }
          }
        }
        return {failures,count:document.querySelectorAll('.card-template').length};
      },{lang,width,stress});
      assert.equal(result.count,31);assert.deepEqual(result.failures,[],`${lang} ${width}px stress=${stress}`);cases+=31;
    }
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${cases} card/language/width/number combinations; all five regions align and text fits.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
