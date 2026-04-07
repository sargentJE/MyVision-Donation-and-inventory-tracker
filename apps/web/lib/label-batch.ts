/**
 * Helpers for building batch-label-print URLs from a set of equipment IDs.
 *
 * URL strategy:
 * - ≤50 ids → `?ids=a,b,c`. UUIDs are ~36 chars so 50 ids ≈ 1.8KB — fine for
 *   every modern browser and every reverse proxy.
 * - >50 ids → store the list under a random token in sessionStorage and
 *   pass `?batch=<token>`. Avoids any risk of URL length limits on long jobs.
 */

export const BATCH_STORAGE_PREFIX = 'myvision:labelBatch:';

export function buildBatchPrintHref(ids: string[]): string {
  if (ids.length === 0) return '/equipment/labels/print';
  if (ids.length <= 50) {
    return `/equipment/labels/print?ids=${ids.join(',')}`;
  }
  if (typeof window === 'undefined') {
    return `/equipment/labels/print?ids=${ids.slice(0, 50).join(',')}`;
  }
  const token =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  window.sessionStorage.setItem(
    `${BATCH_STORAGE_PREFIX}${token}`,
    JSON.stringify(ids),
  );
  return `/equipment/labels/print?batch=${token}`;
}

export function resolveBatchIds(params: URLSearchParams): string[] {
  const batchToken = params.get('batch');
  if (batchToken && typeof window !== 'undefined') {
    try {
      const raw = window.sessionStorage.getItem(
        `${BATCH_STORAGE_PREFIX}${batchToken}`,
      );
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (
          Array.isArray(parsed) &&
          parsed.every((v) => typeof v === 'string')
        ) {
          return parsed as string[];
        }
      }
    } catch {
      // fall through
    }
  }
  const ids = params.get('ids');
  if (!ids) return [];
  return ids
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
