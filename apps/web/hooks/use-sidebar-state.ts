'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'myvision:sidebarCollapsed';

/**
 * Sidebar collapse state, persisted in localStorage.
 *
 * SSR-safe: first server render and first client render both return
 * `collapsed: false` (expanded). After mount, the stored value is read
 * and state updates. Consumers can gate visual details on `hydrated`
 * to avoid icon-swap flashes on load.
 */
export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
    } catch {
      // localStorage unavailable (private mode / SSR); ignore.
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore write failures.
      }
      return next;
    });
  }, []);

  return { collapsed, hydrated, toggle };
}
