import { UserRole } from './roles';

export enum Permission {
  VIEW_OPERATIONS = 'VIEW_OPERATIONS',
  DRIVER_VERIFY = 'DRIVER_VERIFY',
  DISPATCH_EXECUTE = 'DISPATCH_EXECUTE',
  FLEET_MANAGE = 'FLEET_MANAGE',
  USER_MANAGE = 'USER_MANAGE',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SYSTEM_OWNER]: Object.values(Permission),
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.OPERATIONS]: [
    Permission.VIEW_OPERATIONS,
    Permission.DRIVER_VERIFY,
    Permission.DISPATCH_EXECUTE,
    Permission.FLEET_MANAGE,
    Permission.USER_MANAGE,
  ],
  [UserRole.DISPATCHER]: [
    Permission.VIEW_OPERATIONS,
    Permission.DISPATCH_EXECUTE,
  ],
  [UserRole.AGENT]: [Permission.VIEW_OPERATIONS],
  [UserRole.VIEWER]: [Permission.VIEW_OPERATIONS],
  [UserRole.CUSTOMER]: [],
  [UserRole.DRIVER]: [],
};
