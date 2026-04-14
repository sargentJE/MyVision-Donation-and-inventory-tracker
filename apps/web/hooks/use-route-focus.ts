'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Moves focus to the first <h1> inside #main-content on each
 * client-side navigation.  This orients screen-reader users to the
 * new page content rather than leaving focus stranded in the header
 * or sidebar.
 *
 * Skips the initial hard navigation so the browser's native focus
 * behaviour (and the skip-to-content link) are preserved on first load.
 */
export function useRouteFocus() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    requestAnimationFrame(() => {
      const main = document.getElementById('main-content');
      const h1 = main?.querySelector('h1');
      if (h1) {
        if (!h1.hasAttribute('tabindex')) {
          h1.setAttribute('tabindex', '-1');
        }
        h1.focus({ preventScroll: true });
      }
    });
  }, [pathname]);
}
