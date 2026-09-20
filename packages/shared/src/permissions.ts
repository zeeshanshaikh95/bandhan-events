import { ROLES, type Role, isOwnerRole } from "./roles";

/**
 * Permission vocabulary for the whole platform. Future modules reuse these
 * names rather than inventing route-by-route checks, so a change to who may do
 * what lands in exactly one place: ROLE_PERMISSIONS below.
 */
export const PERMISSIONS = [
  "dashboard:read",
  // CRM + operations
  "leads:read",
  "leads:write",
  "leads:delete",
  "customers:read",
  "customers:write",
  "bookings:read",
  "bookings:write",
  "events:read",
  "events:write",
  "quotations:read",
  "quotations:write",
  "vendors:read",
  "vendors:write",
  // Money
  "payments:read",
  "payments:write",
  "expenses:read",
  "expenses:write",
  "finance:read",
  "partners:read",
  "partners:write",
  // Catalog + content
  "catalog:read",
  "catalog:write",
  "media:read",
  "media:write",
  "content:read",
  "content:write",
  "social:read",
  "social:write",
  "reports:read",
  "notifications:read",
  // Governance
  "audit:read",
  "users:manage",
  "settings:read",
  "settings:write",
  "security:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Everything an owner may do. */
const ALL: readonly Permission[] = PERMISSIONS;

/**
 * ADMIN runs the business day to day, including business settings and money,
 * but cannot manage users, change security configuration or owner accounts.
 */
const ADMIN_PERMISSIONS: readonly Permission[] = [
  "dashboard:read",
  "leads:read",
  "leads:write",
  "leads:delete",
  "customers:read",
  "customers:write",
  "bookings:read",
  "bookings:write",
  "events:read",
  "events:write",
  "quotations:read",
  "quotations:write",
  "vendors:read",
  "vendors:write",
  "payments:read",
  "payments:write",
  "expenses:read",
  "expenses:write",
  "finance:read",
  "catalog:read",
  "catalog:write",
  "media:read",
  "media:write",
  "content:read",
  "content:write",
  "social:read",
  "social:write",
  "reports:read",
  "notifications:read",
  "audit:read",
  "settings:read",
  "settings:write",
];

/**
 * MANAGER handles operational work only — no user administration, no security
 * configuration, no financial records, no partner contributions, no audit log.
 */
const MANAGER_PERMISSIONS: readonly Permission[] = [
  "dashboard:read",
  "leads:read",
  "leads:write",
  "customers:read",
  "customers:write",
  "bookings:read",
  "bookings:write",
  "events:read",
  "events:write",
  "quotations:read",
  "quotations:write",
  "vendors:read",
  "vendors:write",
  "catalog:read",
  "media:read",
  "media:write",
  "content:read",
  "content:write",
  "social:read",
  "social:write",
  "reports:read",
  "notifications:read",
  "settings:read",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER_1: ALL,
  OWNER_2: ALL,
  ADMIN: ADMIN_PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
};

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  if (!ROLES.includes(role)) return false;
  return permissionsForRole(role).includes(permission);
}

/** True when the role may touch user accounts, roles or security settings. */
export function canManageGovernance(role: Role): boolean {
  return isOwnerRole(role) || roleHasPermission(role, "security:manage");
}
