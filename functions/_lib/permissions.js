// 角色 → 權限對照表（最小可用版本的 RBAC）。
// 這是目前唯一「知道角色有哪些權限」的地方；之後 middleware／API 都只透過
// hasPermission() 詢問，不會有任何程式碼直接寫 if (role === 'admin')。
// 之後如果要新增權限，只要在對應角色的陣列裡加一個字串即可。
export const ROLE_PERMISSIONS = {
  admin: ['user.view', 'user.create', 'user.edit', 'user.delete', 'card.view', 'card.create', 'card.edit', 'product.view', 'product.create', 'product.edit', 'order.view'],
  user: [],
};

export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
