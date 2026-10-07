'use strict';
(() => {
  const card = document.querySelector('.register-card');
  if (!card) return;
  const panel = document.createElement('section');
  panel.className = 'google-account-panel';
  panel.innerHTML = '<h2></h2><p class="google-description"></p><button type="button" class="ghost-button google-action" disabled></button><p class="form-message" aria-live="polite"></p>';
  card.append(panel);
  const title = panel.querySelector('h2');
  const description = panel.querySelector('.google-description');
  const button = panel.querySelector('button');
  const message = panel.querySelector('.form-message');
  const strings = {
    'zh-TW': ['Google 帳號', '使用 Google 登入', '綁定 Google 帳號', '已綁定：', '既有會員請先用帳密登入，再綁定 Google，以保留收藏、金幣與卡牌。', '綁定後可使用 Google 登入目前的會員帳號。', 'Google 登入尚未開放，請使用帳密登入。', 'Google 登入成功。', 'Google 帳號綁定成功。', '此 Email 已有會員帳號。請先用原帳密登入，再綁定 Google。', '此 Google 帳號或會員帳號已有其他綁定。', '已取消 Google 登入。', '登入狀態已變更，請重新登入後再試。', 'Google 登入未完成，請稍後重試。', '連線中…'],
    en: ['Google account', 'Sign in with Google', 'Link Google account', 'Linked: ', 'Existing members: sign in with your password first, then link Google to keep your collection, coins and cards.', 'Link Google to sign in to this member account.', 'Google sign-in is unavailable. Please use your password.', 'Signed in with Google.', 'Google account linked.', 'This email already has an account. Sign in with your password first, then link Google.', 'This Google or member account is already linked to another account.', 'Google sign-in cancelled.', 'Your session changed. Sign in again and retry.', 'Google sign-in failed. Please try again later.', 'Connecting…'],
    ja: ['Google アカウント', 'Google でログイン', 'Google アカウントを連携', '連携済み：', '既存の会員は先にパスワードでログインしてから Google を連携してください。コレクション、コイン、カードを引き継げます。', 'Google を連携すると、この会員アカウントにログインできます。', 'Google ログインは現在利用できません。パスワードでログインしてください。', 'Google でログインしました。', 'Google アカウントを連携しました。', 'このメールには既存のアカウントがあります。パスワードでログインしてから連携してください。', 'この Google または会員アカウントは別のアカウントと連携済みです。', 'Google ログインをキャンセルしました。', 'ログイン状態が変わりました。再ログインしてお試しください。', 'Google ログインに失敗しました。後でもう一度お試しください。', '接続中…'],
    ko: ['Google 계정', 'Google로 로그인', 'Google 계정 연결', '연결됨: ', '기존 회원은 먼저 비밀번호로 로그인한 뒤 Google을 연결하세요. 컬렉션, 코인과 카드를 유지할 수 있습니다.', 'Google을 연결하면 현재 회원 계정으로 로그인할 수 있습니다.', 'Google 로그인을 사용할 수 없습니다. 비밀번호로 로그인하세요.', 'Google로 로그인했습니다.', 'Google 계정을 연결했습니다.', '이 이메일의 회원 계정이 이미 있습니다. 비밀번호로 로그인한 뒤 연결하세요.', '이 Google 또는 회원 계정은 다른 계정에 연결되어 있습니다.', 'Google 로그인이 취소되었습니다.', '로그인 상태가 변경되었습니다. 다시 로그인하고 시도하세요.', 'Google 로그인에 실패했습니다. 나중에 다시 시도하세요.', '연결 중…'],
  };
  let status = { enabled: false, linkedEmail: null };
  let busy = false;
  let result = new URL(location.href).searchParams.get('google');
  const indexes = { 'signed-in': 7, linked: 8, 'existing-account': 9, conflict: 10, cancelled: 11, 'session-changed': 12, failed: 13, unavailable: 6 };
  if (result) {
    const url = new URL(location.href);
    url.searchParams.delete('google');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  function render() {
    const text = strings[window.CardI18n?.language] || strings['zh-TW'];
    const user = window.FiresideAccount?.user;
    title.textContent = text[0];
    description.textContent = status.linkedEmail ? text[3] + status.linkedEmail : text[user ? 5 : 4];
    button.hidden = Boolean(status.linkedEmail);
    button.disabled = busy || !status.enabled;
    button.textContent = text[busy ? 14 : user ? 2 : 1];
    message.textContent = result ? text[indexes[result] ?? 13] : !status.enabled ? text[6] : '';
    message.dataset.tone = result && !['signed-in', 'linked'].includes(result) ? 'error' : '';
  }
  let revision = 0;
  async function refreshStatus() {
    const current = ++revision;
    try {
      const response = await fetch('/api/google/status', { credentials: 'same-origin' });
      if (!response.ok) throw new Error();
      const next = await response.json();
      if (current === revision) status = next;
    } catch { if (current === revision) status = { enabled: false, linkedEmail: null }; }
    render();
  }
  button.addEventListener('click', async () => {
    if (busy || !status.enabled) return;
    busy = true; result = null; render();
    try {
      const response = await fetch('/api/google/start', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intent: window.FiresideAccount?.user ? 'link' : 'login' }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { result = data.error || 'failed'; return; }
      const destination = new URL(data.url);
      if (destination.origin !== 'https://accounts.google.com') throw new Error();
      location.assign(destination.href);
    } catch { result = 'failed'; }
    finally { busy = false; render(); }
  });
  document.addEventListener('fireside-account-ready', refreshStatus);
  document.getElementById('language')?.addEventListener('change', render);
  refreshStatus();
})();
