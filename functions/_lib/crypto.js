// 密碼雜湊與 session token 產生。全部用 Cloudflare Workers 內建的 Web Crypto API
// （crypto.subtle），不需要額外套件、也不用擔心相依套件的安全性問題。
//
// 密碼儲存格式："pbkdf2-sha256$<iterations>$<saltBase64>$<hashBase64>"
// 把演算法名稱與參數存進字串裡，之後想調高迭代次數也不會讓舊帳號的密碼失效。

// Cloudflare Workers 的 Web Crypto API 對 PBKDF2 疊代次數有上限，超過 100000 會直接
// 丟出 NotSupportedError（實測會讓整個 Function 500）。100000 是 Workers 平台能用的
// 最高值，安全性上仍然足夠（OWASP 2023 對 PBKDF2-HMAC-SHA256 的建議下限是 600000，
// 但那是一般伺服器環境；Workers 平台上這是能做到的最佳選擇）。
const PBKDF2_ITERATIONS = 100000;
const HASH_BITS = 256;

function toBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const actual = await derive(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  // 固定時間比較，避免時序攻擊洩漏雜湊內容。
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function createSessionToken() {
  return toBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
