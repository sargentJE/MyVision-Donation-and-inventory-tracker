/**
 * Builds a URL query string from a filters object.
 * Handles: numbers, strings, booleans, and string arrays (appended as multiple params).
 * Omits undefined/null values.
 */
export function buildQueryString(
  filters: Record<string, string | number | boolean | string[] | undefined | null>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
