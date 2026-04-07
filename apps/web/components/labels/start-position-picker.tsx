'use client';

import { cn } from '@/lib/utils';
import type { LabelTemplate } from '@/lib/label-templates';

interface StartPositionPickerProps {
  template: LabelTemplate;
  value: number;
  onChange: (index: number) => void;
}

/**
 * Visual grid for picking the first cell on a partially-used sticker sheet.
 * Lays out N cells in `template.cols × template.rows` with each cell sized
 * to the template's true label aspect ratio so it visually matches the real
 * sheet.
 *
 * Cells are buttons with `aria-pressed`/`aria-label` so they're keyboard-
 * and screen-reader-accessible.
 */
export function StartPositionPicker({
  template,
  value,
  onChange,
}: StartPositionPickerProps) {
  const aspect = template.labelWidthMm / template.labelHeightMm;
  // Outer wrapper width: `cols * 56px` cell + `(cols-1) * 4px` gap + `16px` padding.
  const wrapperWidth = template.cols * 56 + (template.cols - 1) * 4 + 16;

  return (
    <fieldset>
      <legend className="text-sm font-medium mb-2">
        Start position ({value + 1} of {template.labelsPerSheet})
      </legend>
      <p className="text-xs text-muted-foreground mb-2">
        Labels before this position are left blank — use this to fill a
        partially-used sheet.
      </p>
      <div
        className="rounded-md border bg-white p-2 mx-auto"
        style={{ width: `${wrapperWidth}px` }}
      >
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${template.cols}, 1fr)` }}
        >
          {Array.from({ length: template.labelsPerSheet }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              aria-label={`Start at label position ${i + 1}`}
              aria-pressed={i === value}
              className={cn(
                'rounded-sm border text-[10px] font-mono transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                i === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 text-muted-foreground border-muted hover:bg-muted/60',
              )}
              style={{ aspectRatio: String(aspect) }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
