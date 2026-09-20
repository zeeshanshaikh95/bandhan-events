/**
 * Minimal input sanitisation for the enquiry form.
 * Strips characters commonly used in HTML/script injection and trims length.
 * (Frontend validation is UX only — real security belongs to the future API.)
 */
export function sanitizeText(value: string, maxLength = 1000): string {
  return value
    .replace(/[<>]/g, "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

/** Basic phone validation: 7–15 digits, allowing spaces, dashes, +, (). */
export function isValidPhone(value: string): boolean {
  return /^[+()\-.\s\d]{7,20}$/.test(value) && /\d{7,}/.test(value.replace(/\D/g, ""));
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}
