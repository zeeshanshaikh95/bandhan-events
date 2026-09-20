/**
 * Roles and their human labels. Kept intentionally small: two owners, one
 * operations admin, one manager.
 */
export const ROLES = ["OWNER_1", "OWNER_2", "ADMIN", "MANAGER"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER_1: "Owner 1",
  OWNER_2: "Owner 2",
  ADMIN: "Admin",
  MANAGER: "Manager",
};

export const OWNER_ROLES: readonly Role[] = ["OWNER_1", "OWNER_2"];

export const isOwnerRole = (role: Role): boolean => OWNER_ROLES.includes(role);
