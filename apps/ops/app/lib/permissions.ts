import type { User } from '~/shared/types';

/**
 * Permission helper utilities for role-based access control
 */

export function canDelete(user: User | null): boolean {
  if (!user) return false;
  // Super admins can always delete
  if (user.isSuperAdmin) return true;
  // Only admin role can delete
  return user.role === 'admin';
}

export function canEdit(user: User | null): boolean {
  if (!user) return false;
  // Super admins and admins can edit
  if (user.isSuperAdmin || user.role === 'admin') return true;
  // Maintenance can edit work orders and some fields
  return user.role === 'maintenance';
}

export function canView(user: User | null): boolean {
  if (!user) return false;
  // All authenticated users can view
  return true;
}

export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.isSuperAdmin || user.role === 'admin';
}

export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.isSuperAdmin;
}
