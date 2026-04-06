const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parses a duration string (e.g. "60m", "24h", "7d") into milliseconds.
 * Throws if the format is unrecognised.
 */
export function parseDuration(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(
      `Invalid duration format: "${value}". Expected a number followed by s, m, h, or d.`,
    );
  }
  const num = parseInt(match[1], 10);
  if (num <= 0) {
    throw new Error(`Duration must be greater than zero: "${value}".`);
  }
  return num * UNITS[match[2]];
}
