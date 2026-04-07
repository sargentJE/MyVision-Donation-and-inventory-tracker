'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LabelTemplate } from '@/lib/label-templates';
import { LabelSheet, type LabelCell } from './label-sheet';

interface LabelPrintViewProps {
  template: LabelTemplate;
  cells: LabelCell[];
  startPosition: number;
}

/**
 * Renders two copies of the same label sheet:
 *
 * 1. An on-screen preview, scaled to 50% for easy viewing. The scale
 *    transform is screen-only — `@media print` hides this wrapper.
 *
 * 2. A `.print-only` block portalled directly into `<body>`. This is what
 *    the printer sees. The portal is essential: it makes `.print-only` a
 *    direct child of `<body>`, so the print CSS rule
 *    `body > *:not(.print-only) { display: none }` cleanly removes all
 *    layout chrome (sidebar, header, main, etc.) without taking the print
 *    tree out of normal document flow. Keeping the print tree in normal
 *    flow is essential for `page-break-after` on `.label-sheet` children
 *    to paginate reliably across Chrome, Firefox and Safari — an
 *    `position: absolute` ancestor breaks pagination on Firefox/Safari.
 *
 * Both views share the same source-of-truth render so the on-screen preview
 * is pixel-identical to the printed output (modulo the 50% screen scale).
 */
export function LabelPrintView({
  template,
  cells,
  startPosition,
}: LabelPrintViewProps) {
  // The portal target is `document.body`. We must wait for mount to access it
  // (SSR-safe), so render the portal half only after the first client effect.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Screen preview — scaled down. On screens narrower than the scaled
          sheet (≈400px), the wrapper allows horizontal scroll so mobile
          users can pan across the preview rather than seeing it clipped. */}
      <div className="no-print">
        <div className="text-sm font-medium mb-2">Live preview</div>
        <div
          className="rounded-md border bg-muted/20 overflow-auto"
          style={{
            width: `${template.pageWidthMm * 0.5}mm`,
            maxWidth: '100%',
            height: `${template.pageHeightMm * 0.5}mm`,
            maxHeight: '70vh',
          }}
        >
          <div
            style={{
              transform: 'scale(0.5)',
              transformOrigin: 'top left',
              width: `${template.pageWidthMm}mm`,
            }}
          >
            <LabelSheet
              template={template}
              cells={cells}
              startPosition={startPosition}
            />
          </div>
        </div>
      </div>

      {/* Print target — portalled into body so it's a top-level child for the
          print stylesheet. Rendered only after mount (SSR-safe). */}
      {mounted &&
        createPortal(
          <div className="print-only">
            <LabelSheet
              template={template}
              cells={cells}
              startPosition={startPosition}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
