'use client';

import { useElementSize } from '@/hooks/use-element-size';
import type { LabelTemplate } from '@/lib/label-templates';
import { LabelSheet, type LabelCell } from './label-sheet';

interface PaperPreviewProps {
  template: LabelTemplate;
  cells: LabelCell[];
  startPosition: number;
}

/**
 * Responsive, paper-styled wrapper around `<LabelSheet>`.
 *
 * The label sheet inside is rendered at template-accurate millimetre
 * dimensions (so the print pipeline stays pixel-identical to the on-screen
 * preview), and the wrapper computes a CSS `transform: scale(...)` that
 * fits the sheet exactly into its container's available width — no wasted
 * whitespace, no inner scrollbar, no hard-coded scale factor.
 *
 * The wrapper itself has the visual treatment of a piece of paper sitting
 * on a desk: subtle drop shadow, slightly off-white background tint
 * around the sheet, rounded corners. This is the page's "this is your
 * print, not your UI" cue.
 *
 * Multi-sheet jobs render as a vertical stack of paper sheets with a
 * "Sheet N of N" separator between them (handled inside `LabelSheet`).
 */
export function PaperPreview({
  template,
  cells,
  startPosition,
}: PaperPreviewProps) {
  const [containerRef, { width: containerWidth }] =
    useElementSize<HTMLDivElement>();

  // Approx px-per-mm at 96dpi. Browsers map 1in = 96px = 25.4mm, so
  // 1mm ≈ 3.7795px. Used to compute the natural pixel width of the sheet
  // before scaling.
  const PX_PER_MM = 96 / 25.4;
  const sheetNaturalWidthPx = template.pageWidthMm * PX_PER_MM;

  // Scale: how much we must shrink the sheet to fit the container width.
  // We never scale up beyond 1.0 (no point making a 105mm sheet bigger
  // than its physical size — it would just look blurry).
  const scale =
    containerWidth > 0
      ? Math.min(1, containerWidth / sheetNaturalWidthPx)
      : 0.5; // Reasonable default for first paint before ResizeObserver fires.

  // The scaled sheet wrapper takes the post-scale size in normal flow so
  // the page lays out correctly. The transform is purely visual.
  const scaledHeightPx = template.pageHeightMm * PX_PER_MM * scale;

  return (
    <div ref={containerRef} className="w-full">
      {/* Padded background frame around the paper sheet. */}
      <div className="rounded-lg bg-muted/30 p-4 shadow-sm border">
        {/*
          Outer "scaled box" — has the post-scale dimensions in normal
          flow so siblings/parent lay out correctly. Acts as a clipping
          viewport over the unscaled inner sheet.
        */}
        <div
          style={{
            width: '100%',
            height: `${scaledHeightPx}px`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/*
            Inner "natural-size sheet" — full mm dimensions; the
            `transform: scale()` is purely visual. The drop-shadow filter
            gives the sheet the "piece of paper sitting on a desk" feel.
          */}
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${template.pageWidthMm}mm`,
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.08))',
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
    </div>
  );
}
