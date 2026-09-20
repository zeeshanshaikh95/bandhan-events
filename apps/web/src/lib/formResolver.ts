import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

interface FieldError {
  type: string;
  message: string;
}

type ErrorTree = { [key: string]: FieldError | ErrorTree };

/**
 * Adapter that lets react-hook-form use the *shared* Zod schemas — the same
 * objects the API validates with, so the browser and the server can never
 * disagree about what a valid field is.
 *
 * Zod issues are rebuilt into a nested error tree keyed by full field path
 * (`contact.email`), which react-hook-form resolves for both flat and nested
 * field names.
 */
export function zodFormResolver<TValues extends FieldValues>(
  schema: z.ZodTypeAny
): Resolver<TValues> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      // Parsed output, so normalisation (trimming, lower-casing) matches the API.
      return { values: result.data as TValues, errors: {} };
    }

    const errors: ErrorTree = {};

    for (const issue of result.error.issues) {
      const path = issue.path.map(String);
      if (path.length === 0) continue;

      let cursor = errors;
      for (let index = 0; index < path.length; index += 1) {
        const key = path[index];
        const isLeaf = index === path.length - 1;

        if (isLeaf) {
          // Keep the first message per field: it is the most specific one.
          if (!(key in cursor)) cursor[key] = { type: issue.code, message: issue.message };
        } else {
          if (typeof cursor[key] !== "object") cursor[key] = {};
          cursor = cursor[key] as ErrorTree;
        }
      }
    }

    return { values: {}, errors: errors as never };
  };
}
