'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LabelTemplate } from '@/lib/label-templates';
import { JobSummary } from './job-summary';
import { LabelPrimaryActions } from './label-primary-actions';
import { LabelSheet, type LabelCell } from './label-sheet';
import { PaperPreview } from './paper-preview';

interface LabelPrintViewProps {
  template: LabelTemplate;
  cells: LabelCell[];
  startPosition: number;
  /** Label for the desktop primary print button (e.g. "Print 3 labels"). */
  printLabel: string;
  /** Disable the print button (e.g. while data is loading). */
  printDisabled?: boolean;
}

/**
 * The right-column "preview pane" of the label print pages.
 *
 * Composes three stacked elements on screen:
 *
 *   1. `<JobSummary>`     — three stat tiles ("Sheets / Labels / Cells").
 *   2. `<PaperPreview>`   — responsive scaled paper-styled label sheet.
 *   3. `<LabelPrimaryActions>` — large Print button + (?) instructions popover.
 *
 * Plus a `.print-only` portal rendered as a direct child of `<body>` so
 * the print stylesheet's `body > *:not(.print-only) { display: none }`
 * rule cleanly removes layout chrome without taking the print tree out of
 * normal flow (which would break multi-sheet `page-break-after`).
 */
export function LabelPrintView({
  template,
  cells,
  startPosition,
  printLabel,
  printDisabled,
}: LabelPrintViewProps) {
  // The portal target is `document.body`. We must wait for mount to access
  // it (SSR-safe), so render the portal half only after the first effect.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/*
        Desktop (lg+): the right column becomes a height-constrained flex
        column. JobSummary and LabelPrimaryActions take their natural
        heights at the top and bottom; PaperPreview takes the remaining
        space (`flex-1 min-h-0 overflow-y-auto`) and scrolls internally if
        the scaled sheet is taller than the available area. This guarantees
        the Print button is always visible above the fold without needing
        to shrink the preview into uselessness.

        Mobile: regular vertical stack with `space-y-4`, no height
        constraint — mobile scrolls naturally and the sticky bottom button
        provides the print action.
      */}
      {/*
        `lg:h-[calc(100vh-15.5rem)]` bounds the right column's height on
        desktop so `flex-1 min-h-0 overflow-y-auto` on the preview area
        pins JobSummary at the top and LabelPrimaryActions at the bottom
        while the preview scrolls internally. The 15.5rem (248px) is the
        total chrome above this grid:

            authenticated <header> (h-14)       56px
            <main> p-6 top padding              24px
            back-button toolbar row             60px  (Button + mb-6)
            heading + badge + mb-6            ~104px
            viewport breathing room              4px
                                                ----
                                               248px = 15.5rem

        Empirically tuned for laptop viewports ≥ 720px tall. Shorter
        windows fall through to `lg:min-h-[28rem]` (448px), which keeps
        the column usable on very short viewports at the cost of
        requiring a page scroll.
      */}
      <div className="no-print space-y-4 lg:space-y-0 lg:flex lg:flex-col lg:gap-4 lg:h-[calc(100vh-15.5rem)] lg:min-h-[28rem]">
        <JobSummary
          cellCount={cells.length}
          startPosition={startPosition}
          template={template}
        />
        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
          <PaperPreview
            template={template}
            cells={cells}
            startPosition={startPosition}
          />
        </div>
        <LabelPrimaryActions
          template={template}
          printLabel={printLabel}
          printDisabled={printDisabled}
        />
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
