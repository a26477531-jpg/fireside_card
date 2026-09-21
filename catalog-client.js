// Database catalog is authoritative: do not silently display archived static cards on API failure.
(() => {
  window.CARDS = [];
  window.FiresideCatalog = {products:[],state:'loading'};
  const message=document.createElement('p');message.setAttribute('role','status');message.style.cssText='text-align:center;padding:16px;margin:0';
  (document.querySelector('#shop .shop-inner') || document.querySelector('main')).prepend(message);
  function status(){const state=window.FiresideCatalog.state;message.textContent=CardI18n.t(state==='error'?'catalogError':state==='loading'?'catalogLoading':'catalogEmpty');message.hidden=state==='ready' && (!document.getElementById('shop') || window.FiresideCatalog.products.length>0);}
  document.getElementById('language').addEventListener('change',()=>{CardI18n.setLanguage(document.getElementById('language').value);status();});
  status();
  fetch('/api/catalog',{credentials:'same-origin',cache:'no-store'}).then(async response=>{
    if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    if(!response.ok)throw new Error();const data=await response.json();if(!data.ok || !Array.isArray(data.cards) || !Array.isArray(data.products))throw new Error();
    window.CARDS=data.cards;window.FiresideCatalog.products=data.products;window.FiresideCatalog.state='ready';
    status();document.dispatchEvent(new Event('fireside-catalog-ready'));
  }).catch(()=>{window.FiresideCatalog.state='error';status();});
})();
