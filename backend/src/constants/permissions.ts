import { UserRole } from './roles';

export enum Permission {
  VIEW_OPERATIONS = 'VIEW_OPERATIONS',
  DRIVER_VERIFY = 'DRIVER_VERIFY',
  DISPATCH_EXECUTE = 'DISPATCH_EXECUTE',
  FLEET_MANAGE = 'FLEET_MANAGE',
  USER_MANAGE = 'USER_MANAGE',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS',
  RENTAL_MANAGE = 'RENTAL_MANAGE',
  RENTAL_REVIEW = 'RENTAL_REVIEW',
  MOVER_MANAGE = 'MOVER_MANAGE',
  MOVER_REVIEW = 'MOVER_REVIEW',
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
    Permission.RENTAL_MANAGE,
    Permission.RENTAL_REVIEW,
    Permission.MOVER_MANAGE,
    Permission.MOVER_REVIEW,
  ],
  [UserRole.DISPATCHER]: [
    Permission.VIEW_OPERATIONS,
    Permission.DISPATCH_EXECUTE,
  ],
  [UserRole.AGENT]: [Permission.VIEW_OPERATIONS],
  [UserRole.VIEWER]: [Permission.VIEW_OPERATIONS],
  [UserRole.RENTAL_PARTNER]: [Permission.RENTAL_MANAGE],
  [UserRole.MOVER_PARTNER]: [Permission.MOVER_MANAGE],
  [UserRole.CUSTOMER]: [],
  [UserRole.DRIVER]: [],
};
