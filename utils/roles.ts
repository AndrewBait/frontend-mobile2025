export type AppRole = 'customer' | 'store_owner';

export const normalizeRole = (role?: string | null): AppRole | undefined => {
  if (!role) return undefined;
  if (role === 'merchant') return 'store_owner';
  if (role === 'customer' || role === 'store_owner') return role;
  return undefined;
};
