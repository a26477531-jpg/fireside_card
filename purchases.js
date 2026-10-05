'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const labels={
    'zh-TW':{intro:'查看自己的卡牌購買紀錄，依時間由新到舊排列。商品與卡牌名稱保留購買當下的內容。',loading:'正在載入購買紀錄…',empty:'尚無購買紀錄，前往商城挑選卡牌吧。',login:'請先登入以查看自己的購買紀錄。',error:'購買紀錄載入失敗，請重新載入。',unavailable:'購買紀錄暫時無法使用，請稍後再試。',number:'訂單編號',date:'購買時間',product:'組合包',quantity:'數量',total:'總金額',status:'狀態',cards:'查看內含卡牌',missing:'此筆舊訂單未保存卡牌明細。',previous:'上一頁',next:'下一頁',page:'頁',records:'筆紀錄',pending:'處理中',completed:'已完成',cancelled:'已取消',refunded:'已退款'},
    en:{intro:'Your card purchases, newest first. Product and card names are preserved as purchased.',loading:'Loading purchases…',empty:'No purchases yet. Visit the shop to choose cards.',login:'Sign in to view your purchase history.',error:'Unable to load purchases. Please reload.',unavailable:'Purchase history is temporarily unavailable. Try later.',number:'Order number',date:'Purchased at',product:'Pack',quantity:'Quantity',total:'Total',status:'Status',cards:'View included cards',missing:'Card details were not saved for this older order.',previous:'Previous',next:'Next',page:'Page',records:'orders',pending:'Pending',completed:'Completed',cancelled:'Cancelled',refunded:'Refunded'},
    ja:{intro:'自分の購入履歴を新しい順に表示します。商品・カード名は購入時の内容です。',loading:'購入履歴を読み込み中…',empty:'購入履歴はありません。ショップでカードを選べます。',login:'購入履歴を見るにはログインしてください。',error:'購入履歴を読み込めません。再読み込みしてください。',unavailable:'購入履歴は一時的に利用できません。',number:'注文番号',date:'購入日時',product:'パック',quantity:'数量',total:'合計',status:'状態',cards:'含まれるカードを見る',missing:'この過去の注文にはカード明細が保存されていません。',previous:'前へ',next:'次へ',page:'ページ',records:'件',pending:'処理中',completed:'完了',cancelled:'キャンセル済み',refunded:'返金済み'},
    ko:{intro:'내 구매 내역을 최신순으로 표시합니다. 상품과 카드 이름은 구매 당시 내용입니다.',loading:'구매 내역을 불러오는 중…',empty:'구매 내역이 없습니다. 상점에서 카드를 골라 보세요.',login:'구매 내역을 보려면 로그인해 주세요.',error:'구매 내역을 불러오지 못했습니다. 다시 시도해 주세요.',unavailable:'구매 내역을 일시적으로 사용할 수 없습니다.',number:'주문 번호',date:'구매 시간',product:'팩',quantity:'수량',total:'총액',status:'상태',cards:'포함된 카드 보기',missing:'이전 주문의 카드 상세 정보가 저장되지 않았습니다.',previous:'이전',next:'다음',page:'페이지',records:'건',pending:'처리 중',completed:'완료',cancelled:'취소됨',refunded:'환불됨'}
  };
  const t=key=>(labels[CardI18n.language]||labels['zh-TW'])[key];
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let orders=[],page=1,total=0,pageSize=25,loading=false,status='',generation=0;
  function render(){
    const title=CardCommerce.t('purchaseHistory');
    document.title=title+' | '+CardI18n.t('brand');$('history-title').textContent=title;
    $('history-intro').textContent=t('intro');$('history-status').textContent=status?t(status):'';
    $('history-reload').textContent=CardCommerce.t('reload');$('history-reload').disabled=loading;
    $('history-login').textContent=CardI18n.t('login');$('history-login').hidden=status!=='login';
    $('history-shop').textContent=CardI18n.t('shop');
    $('history-list').setAttribute('aria-busy',String(loading));
    $('history-list').innerHTML=orders.map(order=>{
      const amount=new Intl.NumberFormat(CardI18n.language).format(order.total)+' '+(order.currency==='COIN'?CardCommerce.t('coins'):order.currency);
      const date=new Date(order.createdAt).toLocaleString(CardI18n.language);
      const fields=[['number',order.orderNumber||'—'],['date',date],['quantity',order.quantity],['total',amount],['status',t(order.status)||order.status]];
      return `<article class="history-order"><p class="history-eyebrow">${escape(t('product'))}</p><h2>${escape(order.productName)}</h2><dl>${fields.map(([key,value])=>`<div><dt>${escape(t(key))}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><details><summary>${escape(t('cards'))}</summary>${order.cards?.length?`<ul>${order.cards.map(card=>`<li>${escape(card.name||card.id)}</li>`).join('')}</ul>`:`<p>${escape(t('missing'))}</p>`}</details></article>`;
    }).join('');
    $('history-pagination').hidden=!!status||total===0;
    $('history-page').textContent=`${t('page')} ${page} / ${Math.max(1,Math.ceil(total/pageSize))} · ${total} ${t('records')}`;
    $('history-previous').textContent=t('previous');$('history-next').textContent=t('next');
    $('history-previous').disabled=loading||page<=1;$('history-next').disabled=loading||page*pageSize>=total;
  }
  async function load(targetPage=1){
    const current=++generation;loading=true;status='loading';orders=[];render();
    try {
      const response=await fetch('/api/purchases?page='+targetPage,{credentials:'same-origin',cache:'no-store'});
      if(current!==generation)return;
      if(response.status===401){status='login';total=0;return;}
      if(response.status===503){status='unavailable';return;}
      if(!response.ok)throw Error();
      const result=await response.json();if(current!==generation)return;
      if(!result.ok||!Array.isArray(result.orders))throw Error();
      orders=result.orders;page=result.page;total=result.total;pageSize=result.pageSize;status=orders.length?'':'empty';
    }catch{if(current===generation)status='error';}
    finally{if(current===generation){loading=false;render();}}
  }
  $('history-reload').onclick=()=>load(page);
  $('history-previous').onclick=()=>load(page-1);$('history-next').onclick=()=>load(page+1);
  $('language').value=CardI18n.language;
  $('language').addEventListener('change',()=>{CardI18n.setLanguage($('language').value);CardI18n.applyUI();render();});
  window.addEventListener('pageshow',event=>{if(event.persisted)load();});
  CardI18n.applyUI();load();
})();
