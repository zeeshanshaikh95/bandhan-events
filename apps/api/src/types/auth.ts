import type { Permission, Role, UserStatus } from "@bandhan/shared";

/** The authenticated user as the server sees it (never carries a hash). */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  permissions: Permission[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface AuthSession {
  id: string;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
}

export interface AuthContext {
  user: AuthUser;
  session: AuthSession;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: AuthContext;
    }
  }
}

export {};
