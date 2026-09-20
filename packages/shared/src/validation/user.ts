import { z } from "zod";
import { ROLES } from "../roles";
import { USER_STATUSES } from "../constants";
import { emailSchema, objectIdSchema, trimmedString } from "./primitives";
import { passwordSchema } from "./auth";

/**
 * Creating a user always issues a temporary password and always forces a
 * change on first login — the server sets both flags, never the client.
 */
export const userCreateSchema = z.object({
  name: trimmedString(80, 2),
  email: emailSchema,
  role: z.enum(ROLES),
  temporaryPassword: passwordSchema,
  status: z.enum(USER_STATUSES).default("ACTIVE"),
});

export const userUpdateSchema = z
  .object({
    name: trimmedString(80, 2).optional(),
    role: z.enum(ROLES).optional(),
    status: z.enum(USER_STATUSES).optional(),
  })
  .strict();

/** Owner/admin-initiated password reset for another user. */
export const userPasswordResetSchema = z.object({
  temporaryPassword: passwordSchema,
  forceChange: z.boolean().default(true),
});

export const userListQuerySchema = z.object({
  search: trimmedString(80).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});

export const userIdParamSchema = z.object({ id: objectIdSchema });
