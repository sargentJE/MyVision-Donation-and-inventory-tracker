'use client';

import { useLayoutEffect, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

/**
 * Track the rendered size of an element.
 *
 * Returns a ref to attach to the element and the latest measured
 * `{ width, height }` in pixels. SSR-safe: returns `{ 0, 0 }` until
 * the element mounts, then synchronously measures the element via
 * `getBoundingClientRect()` (in `useLayoutEffect`, before the browser
 * paints) so the very first painted frame already has the correct size.
 *
 * Subsequent size changes are observed via `ResizeObserver`.
 *
 * The synchronous initial measure is the important detail — without it,
 * the consumer's first render uses 0/0 and may render at a fallback
 * scale, which then briefly flashes before the observer fires. With it,
 * there is no flash.
 */
export function useElementSize<T extends HTMLElement>(): [
  React.RefObject<T>,
  Size,
] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Synchronous initial measurement so the first painted frame is correct.
    const initial = el.getBoundingClientRect();
    setSize((prev) =>
      prev.width === initial.width && prev.height === initial.height
        ? prev
        : { width: initial.width, height: initial.height },
    );

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
