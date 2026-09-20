import { z } from "zod";

/**
 * Trimmed, control-character-free string. Never trust raw input length.
 *
 * Messages are written for the person filling in the form — these strings are
 * rendered directly in the website's enquiry form and the dashboard, so raw
 * Zod defaults ("String must contain at least 2 character(s)") must not leak.
 */
export const trimmedString = (max: number, min = 1) =>
  z
    .string({ required_error: "This field is required." })
    .transform((value) => value.replace(/[\u0000-\u001F\u007F]/g, "").trim())
    .pipe(
      z
        .string()
        .min(min, {
          message: min <= 1 ? "This field is required." : `Please enter at least ${min} characters.`,
        })
        .max(max, { message: `Please keep this under ${max} characters.` })
    );

/** Indian-friendly but permissive: 7–15 digits, optional +, spaces, dashes, parens. */
export const phoneSchema = trimmedString(20)
  .refine((value) => /^[+()\-.\s\d]+$/.test(value), { message: "Use digits, spaces, +, - or ( ) only." })
  .refine((value) => /^\d{7,15}$/.test(value.replace(/\D/g, "")), {
    message: "Enter a valid phone number with 7–15 digits.",
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email("Enter a valid email address.").max(254));

/** MongoDB ObjectId as a 24-character hex string. */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid identifier.");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * A choice field (select) with one human message for both a missing and an
 * invalid value — `errorMap` is the only Zod hook that covers both, and it
 * keeps "Invalid enum value. Expected 'a' | 'b'" out of user-facing errors.
 */
export const choiceSchema = <T extends [string, ...string[]]>(values: T, message: string) =>
  z.enum(values, { errorMap: () => ({ message }) });

/** Optional free-text field with an explicit maximum length. */
export const optionalText = (max: number) =>
  z
    .string()
    .transform((value) => value.replace(/[\u0000-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max))
    .optional()
    .or(z.literal("").transform(() => undefined));

/** ISO date (YYYY-MM-DD), as produced by a native date input. */
export const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date.")
  .optional()
  .or(z.literal("").transform(() => undefined));
