// Fit translated text and numbers inside the card's fixed regions.
// Start at the CSS font size and reduce only cards whose text actually overflows.
(() => {
  const pending = new Set();
  let frame;
  function textRects(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()].filter(rect=>rect.width>0);
  }
  function rulesFit(box) {
    const bounds=box.getBoundingClientRect();
    const style=getComputedStyle(box);
    const notch=parseFloat(style.getPropertyValue('--rules-notch') || '55')/100;
    const inset=parseFloat(style.getPropertyValue('--rules-inset') || '24')/100;
    return [...box.querySelectorAll('.rule-block strong,.rule-block>span')].every(node=>textRects(node).every(rect=>
      rect.bottom<=bounds.bottom+0.5 && rect.left>=bounds.left-0.5 && rect.right<=bounds.right+0.5 &&
      (rect.bottom<=bounds.top+bounds.height*notch+0.5 ||
       (rect.left>=bounds.left+bounds.width*inset-0.5 && rect.right<=bounds.right-bounds.width*inset+0.5))));
  }
  function fit(root) {
    for(const art of root.querySelectorAll('.card-art')) {
      const name=art.querySelector('.card-name'),rules=art.querySelector('.card-ability');
      if(!name || !rules || !name.getBoundingClientRect().width)continue;
      for(const box of [name,rules,...art.querySelectorAll('.card-stat')]) {
        if(!box.dataset.baseFont && box.style.fontSize)box.dataset.baseFont=box.style.fontSize;
        if(box.dataset.baseFont)box.style.fontSize=box.dataset.baseFont;
        else box.style.removeProperty('font-size');
        const start=parseFloat(getComputedStyle(box).fontSize);
        const okay=()=>{
          if(box===rules)return rulesFit(box);
          const bounds=box.getBoundingClientRect();
          return textRects(box).every(r=>r.left>=bounds.left-.5&&r.right<=bounds.right+.5&&r.top>=bounds.top-.5&&r.bottom<=bounds.bottom+.5);
        };
        let size=start;
        // Bounded by the card's scale rather than a fixed pixel minimum.
        const minimum=art.getBoundingClientRect().width*.022;
        while(!okay() && size>minimum){size=Math.max(minimum,size-.25);box.style.fontSize=size+'px';}
        box.dataset.textFits=String(okay());
      }
    }
  }
  function schedule(root) {
    pending.add(root);
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=null;for(const el of pending)if(el.isConnected)fit(el);pending.clear();});
  }
  window.CardTextFit={fit,schedule,rulesFit};
  window.addEventListener('resize',()=>schedule(document));
  document.fonts?.ready.then(()=>schedule(document));
})();
