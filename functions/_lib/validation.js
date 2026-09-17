// 註冊表單的驗證規則。這裡的規則一定要跟 register.js（前端即時驗證）保持一致，
// 前端只是先擋一次讓使用者體驗好一點，真正說了算的還是這裡（永遠不能只信任前端）。

// 一般寬鬆的 Email 格式檢查（不追求完全符合 RFC 5322，那對使用者不友善也沒必要）。
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 使用者名稱：3～20 個字，允許中英數字與底線（\p{L}/\p{N} 支援中日韓文字）。
export const USERNAME_RE = /^[\p{L}\p{N}_]{3,20}$/u;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // PBKDF2 沒有 bcrypt 的 72 bytes 限制，這裡純粹是合理上限避免濫用。

export function validateEmail(email) {
  if (typeof email !== 'string' || !email.trim()) return 'required';
  if (email.length > 254) return 'too-long';
  if (!EMAIL_RE.test(email.trim())) return 'invalid-format';
  return null;
}

export function validateUsername(username) {
  if (typeof username !== 'string' || !username.trim()) return 'required';
  if (!USERNAME_RE.test(username.trim())) return 'invalid-format';
  return null;
}

// 密碼規則：長度至少 8 碼，且同時包含字母與數字。回傳 null 代表通過。
export function validatePassword(password) {
  if (typeof password !== 'string' || !password) return 'required';
  if (password.length < PASSWORD_MIN_LENGTH) return 'too-short';
  if (password.length > PASSWORD_MAX_LENGTH) return 'too-long';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'too-weak';
  return null;
}

// 0（太弱，不可送出）～3（強）的簡易密碼強度分數，前端拿來畫強度條用。
export function passwordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score >= 4 ? 3 : score >= 3 ? 2 : score >= 1 ? 1 : 0;
}
