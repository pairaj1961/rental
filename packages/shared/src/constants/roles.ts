import { UserRole } from '../types/user';

export type Permission =
  | 'rental:create'
  | 'rental:transition'
  | 'rental:view:all'
  | 'rental:view:own'
  | 'rental:view:assigned'
  | 'equipment:create'
  | 'equipment:edit'
  | 'equipment:delete'
  | 'photo:upload'
  | 'photo:set_cover'
  | 'photo:edit_caption'
  | 'photo:delete'
  | 'customer:edit'
  | 'inspection:create'
  | 'maintenance:create'
  | 'document:generate'
  | 'rental:close'
  | 'audit:view'
  | 'report:view'
  | 'dashboard:view';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    'rental:create',
    'rental:transition',
    'rental:view:all',
    'equipment:create',
    'equipment:edit',
    'equipment:delete',
    'photo:upload',
    'photo:set_cover',
    'photo:edit_caption',
    'photo:delete',
    'customer:edit',
    'inspection:create',
    'maintenance:create',
    'document:generate',
    'rental:close',
    'audit:view',
    'report:view',
    'dashboard:view',
  ],
  [UserRole.MANAGER]: [
    'rental:create',
    'rental:transition',
    'rental:view:all',
    'equipment:create',
    'equipment:edit',
    'photo:upload',
    'photo:set_cover',
    'photo:edit_caption',
    'photo:delete',
    'customer:edit',
    'document:generate',
    'rental:close',
    'audit:view',
    'report:view',
    'dashboard:view',
  ],
  [UserRole.REP]: [
    'rental:create',
    'rental:view:own',
    'customer:edit',
    'dashboard:view',
  ],
  [UserRole.PRODUCT_MANAGER]: [
    'rental:view:assigned',
    'photo:upload',
    'photo:edit_caption',
    'inspection:create',
    'maintenance:create',
    'equipment:create',
    'equipment:edit',
    'dashboard:view',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
