'use strict';
(() => {
  const labels={
    'zh-TW':{myCards:'我的卡片',wishlist:'我的收藏',shopBuy:'購買組合包',shopIntro:'使用站內金幣購買卡牌組合包；購買後可在「我的卡片」查看，收藏清單會保留。',confirm:'確認購買',cancel:'取消',buyPrompt:'購買此組合包？重複購買會累計持有張數。',working:'購買中…',success:'購買成功！卡牌已加入「我的卡片」。',login:'請先登入再購買。',insufficient:'金幣不足，請先加值。',changed:'商品或價格已變更／下架，請重新整理後再購買。',unavailable:'購買功能尚未完成資料庫設定，請稍後再試。',retry:'未能確認購買結果，請重試同一筆購買；系統不會重複扣款。',ownedIntro:'這裡是你購買的卡牌；收藏代表喜歡，取消收藏不會移除已購買的卡牌。',empty:'尚未購買卡牌，前往商城挑選組合包。',loadError:'卡牌載入失敗，請重試。',reload:'重新載入',owned:'持有',search:'搜尋我的卡片',favorite:'加入收藏',unfavorite:'取消收藏',favoriteError:'收藏更新失敗，請重試。',loginOwned:'請登入以查看自己購買的卡牌。',details:'查看卡牌',close:'關閉',coins:'金幣'},
    en:{myCards:'My cards',wishlist:'Wishlist',shopBuy:'Buy pack',shopIntro:'Buy packs with site coins. Purchased cards appear in My cards; your wishlist is kept.',confirm:'Confirm purchase',cancel:'Cancel',buyPrompt:'Buy this pack? Repeat purchases add more copies.',working:'Purchasing…',success:'Purchased! Cards added to My cards.',login:'Sign in to purchase.',insufficient:'Not enough coins. Top up first.',changed:'Product or price changed. Refresh before purchasing.',unavailable:'Purchases are not configured yet. Try later.',retry:'Purchase outcome unknown. Retry this purchase safely without a duplicate charge.',ownedIntro:'Cards you bought. Removing a wishlist favorite does not remove owned cards.',empty:'No cards yet. Visit the shop to buy a pack.',loadError:'Unable to load cards. Retry.',reload:'Reload',owned:'Owned',search:'Search my cards',favorite:'Add to wishlist',unfavorite:'Remove from wishlist',favoriteError:'Unable to save favorite. Retry.',loginOwned:'Sign in to see your purchased cards.',details:'View card',close:'Close',coins:'coins'},
    ja:{myCards:'所持カード',wishlist:'お気に入り',shopBuy:'パックを購入',shopIntro:'サイト内コインで購入すると所持カードに追加されます。お気に入りは保持されます。',confirm:'購入を確定',cancel:'キャンセル',buyPrompt:'このパックを購入しますか？再購入すると所持枚数が増えます。',working:'購入中…',success:'所持カードに追加しました。',login:'ログインしてください。',insufficient:'コインが不足しています。チャージしてください。',changed:'商品が変更されました。再読み込みしてください。',unavailable:'購入の設定が完了していません。',retry:'結果を確認できません。同じ購入を再試行しても二重請求されません。',ownedIntro:'購入したカードです。お気に入り解除でも所持カードは残ります。',empty:'所持カードはありません。ショップで購入できます。',loadError:'読み込みに失敗しました。',reload:'再読み込み',owned:'所持枚数',search:'所持カードを検索',favorite:'お気に入りに追加',unfavorite:'お気に入り解除',favoriteError:'保存に失敗しました。',loginOwned:'所持カードを見るにはログインしてください。',details:'カードを見る',close:'閉じる',coins:'コイン'},
    ko:{myCards:'내 카드',wishlist:'즐겨찾기',shopBuy:'팩 구매',shopIntro:'사이트 코인으로 구매한 카드는 내 카드에 추가됩니다. 즐겨찾기는 유지됩니다.',confirm:'구매 확인',cancel:'취소',buyPrompt:'이 팩을 구매할까요? 다시 구매하면 보유 수량이 늘어납니다.',working:'구매 중…',success:'내 카드에 추가했습니다.',login:'로그인해 주세요.',insufficient:'코인이 부족합니다. 충전해 주세요.',changed:'상품이 변경되었습니다. 새로고침해 주세요.',unavailable:'구매 설정이 아직 완료되지 않았습니다.',retry:'결과를 확인할 수 없습니다. 같은 구매를 재시도해도 중복 차감되지 않습니다.',ownedIntro:'구매한 카드입니다. 즐겨찾기를 해제해도 보유 카드는 유지됩니다.',empty:'보유 카드가 없습니다. 상점에서 구매해 주세요.',loadError:'불러오지 못했습니다.',reload:'다시 불러오기',owned:'보유 수량',search:'내 카드 검색',favorite:'즐겨찾기 추가',unfavorite:'즐겨찾기 해제',favoriteError:'저장에 실패했습니다.',loginOwned:'구매한 카드를 보려면 로그인해 주세요.',details:'카드 보기',close:'닫기',coins:'코인'}
  };
  const t=key=>(labels[window.CardI18n?.language]||labels['zh-TW'])[key];
  function nav(){
    const parent=document.querySelector('.navbar nav');if(!parent)return;
    for(const [id,key,href] of [['nav-my-cards','myCards','my-cards.html'],['nav-wishlist','wishlist','index.html?favorites=1#library']]){
      let link=document.getElementById(id);if(!link){link=document.createElement('a');link.id=id;link.href=href;parent.append(link);}link.textContent=t(key);
    }
  }
  const pending=new Map();let busy=false;
  // Keep a request key across reloads after an uncertain network result.
  function requestKey(bundle){
    const key='fireside-purchase:'+window.FiresideAccount.user.id+':'+bundle.id;
    let saved=pending.get(key);try{saved=saved||JSON.parse(sessionStorage.getItem(key));}catch{}
    if(!saved){saved={requestId:crypto.randomUUID(),expectedPrice:bundle.coinPrice,productVersion:bundle.version};}
    pending.set(key,saved);try{sessionStorage.setItem(key,JSON.stringify(saved));}catch{}
    return {key,saved};
  }
  async function buy(bundle){
    if(busy)return;
    if(!bundle || !Number.isInteger(bundle.version)){alert(t('unavailable'));return;}
    if(!window.FiresideAccount?.user){location.href='login.html';return;}
    const {key,saved}=requestKey(bundle);
    const opener=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='purchase-confirm';dialog.setAttribute('aria-labelledby','purchase-confirm-title');
    const title=document.createElement('h2');title.id='purchase-confirm-title';title.textContent=t('confirm');
    const description=document.createElement('p');description.textContent=`${bundle.name} — ${saved.expectedPrice} ${t('coins')}. ${t('buyPrompt')}`;
    const message=document.createElement('p');message.setAttribute('role','status');
    const confirm=document.createElement('button');confirm.className='gold-button';confirm.textContent=t('confirm');
    const cancel=document.createElement('button');cancel.className='gold-button';cancel.textContent=t('cancel');
    dialog.append(title,description,message,confirm,cancel);document.body.append(dialog);dialog.showModal();cancel.focus();busy=true;
    const forget=()=>{pending.delete(key);try{sessionStorage.removeItem(key);}catch{}};
    let submitting=false,attempted=false;
    dialog.addEventListener('cancel',event=>{if(submitting)event.preventDefault();});
    dialog.addEventListener('close',()=>{busy=false;dialog.remove();opener?.focus();});
    cancel.onclick=()=>{if(!attempted)forget();dialog.close();};
    dialog.addEventListener('cancel',()=>{if(!attempted)forget();});
    confirm.onclick=async()=>{
      attempted=true;submitting=true;confirm.disabled=true;cancel.disabled=true;message.textContent=t('working');
      try{
        const response=await fetch('/api/purchases',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:bundle.id,...saved})});
        const result=await response.json();
        if(!response.ok){
          const errors={'insufficient-coins':'insufficient','product-changed':'changed','purchase-not-ready':'unavailable','unauthenticated':'login'};
          if(response.status<500){forget();confirm.hidden=true;}
          message.textContent=t(errors[result.error]||'retry');
          return;
        }
        forget();window.FiresideAccount.updateCoinBalance(result.coinBalance);message.textContent=t('success');confirm.hidden=true;
        const link=document.createElement('a');link.href='my-cards.html';link.textContent=t('myCards');dialog.append(link);
      }catch{message.textContent=t('retry');}
      finally{submitting=false;confirm.disabled=false;cancel.disabled=false;}
    };
  }
  window.CardCommerce={t,buy};nav();
  document.getElementById('language')?.addEventListener('change',()=>{window.CardI18n.setLanguage(document.getElementById('language').value);nav();});
})();
