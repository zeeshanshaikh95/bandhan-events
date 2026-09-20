import { z } from "zod";
import { emailSchema, trimmedString } from "./primitives";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * A short deny-list of passwords that appear at the top of every breach
 * corpus. The real defence is length + the strength checks below; this exists
 * so the obviously-terrible choices never reach the hasher.
 */
export const COMMON_PASSWORDS = [
  "password",
  "password1",
  "password123",
  "passw0rd123",
  "123456789012",
  "qwertyuiop12",
  "administrator",
  "administrator1",
  "letmein12345",
  "welcome12345",
  "bandhan12345",
  "bandhanevents",
  "iloveyou1234",
  "abcd1234abcd",
] as const;

/**
 * Strong-password policy (§17): at least 12 characters with upper, lower,
 * digit and symbol, and not a known-bad password.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`)
  .refine((value) => /[a-z]/.test(value), "Include at least one lowercase letter.")
  .refine((value) => /[A-Z]/.test(value), "Include at least one uppercase letter.")
  .refine((value) => /\d/.test(value), "Include at least one number.")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Include at least one symbol.")
  .refine(
    (value) => !COMMON_PASSWORDS.includes(value.toLowerCase() as (typeof COMMON_PASSWORDS)[number]),
    "This password is too common. Choose something less predictable."
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX_LENGTH),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(PASSWORD_MAX_LENGTH),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: trimmedString(200, 20),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

/** Explains *why* a password fails, for live feedback in the UI. */
export function passwordStrengthIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) issues.push(`At least ${PASSWORD_MIN_LENGTH} characters`);
  if (!/[a-z]/.test(password)) issues.push("One lowercase letter");
  if (!/[A-Z]/.test(password)) issues.push("One uppercase letter");
  if (!/\d/.test(password)) issues.push("One number");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("One symbol");
  if (COMMON_PASSWORDS.includes(password.toLowerCase() as (typeof COMMON_PASSWORDS)[number]))
    issues.push("Not a commonly used password");
  return issues;
}
