'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'myvision:inventorySelection';

/**
 * Persisted multi-select state for the inventory list.
 *
 * - Persisted in `sessionStorage` so navigating to an item's detail page
 *   (and back) preserves an in-progress label batch within the tab.
 * - Dies with the tab — selection is intentionally not synced to the
 *   server or to other tabs.
 * - SSR-safe: first render is empty, then hydrates from storage on mount.
 *
 * The hook owns persistence so callers don't have to repeat the
 * try/catch/JSON dance, and so toggle/clear/select-all-on-page all
 * persist atomically.
 */
export function useInventorySelection() {
  const [selection, setSelection] = useState<Set<string>>(new Set());

  // Hydrate from sessionStorage on mount.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
        setSelection(new Set(parsed as string[]));
      }
    } catch {
      // sessionStorage unavailable or malformed entry — start fresh.
    }
  }, []);

  const persist = useCallback((next: Set<string>) => {
    try {
      if (next.size === 0) {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      }
    } catch {
      // Ignore write failures (private mode, quota exceeded, etc.).
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setSelection(new Set());
    persist(new Set());
  }, [persist]);

  /**
   * Toggle every id on the current page: if all are already selected,
   * deselect them all; otherwise select any that aren't yet selected.
   * Mirrors the GMail-style "select all visible" checkbox semantics.
   */
  const toggleAllOnPage = useCallback(
    (ids: string[]) => {
      setSelection((prev) => {
        const next = new Set(prev);
        const allSelected = ids.every((id) => next.has(id));
        if (allSelected) {
          ids.forEach((id) => next.delete(id));
        } else {
          ids.forEach((id) => next.add(id));
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { selection, toggle, clear, toggleAllOnPage };
}
