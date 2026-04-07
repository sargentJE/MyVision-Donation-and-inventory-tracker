import { Transform } from 'class-transformer';

/**
 * Normalize an email address: trim whitespace and lowercase.
 *
 * Stack on a DTO field above `@IsEmail()`. Runs as part of the global
 * `ValidationPipe` (configured with `transform: true` in `main.ts`).
 *
 * Used for case-insensitive login: paired with the `@db.Citext` column
 * type on `User.email`, this guarantees email comparisons match no
 * matter how the user types their address.
 */
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}

/** Pure helper for service-layer normalization (mirrors NormalizeEmail). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
