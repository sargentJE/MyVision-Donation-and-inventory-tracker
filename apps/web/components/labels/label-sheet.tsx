'use client';

import {
  getCellPosition,
  type LabelTemplate,
} from '@/lib/label-templates';
import { LabelContent, type LabelEquipment } from './label-content';

export interface LabelCell {
  equipment: LabelEquipment;
  qrUrl: string;
}

interface LabelSheetProps {
  template: LabelTemplate;
  /**
   * Labels to place, in order. Each entry occupies one cell.
   * `null` entries are intentional empty cells (used when start position > 0).
   */
  cells: Array<LabelCell | null>;
  /**
   * Offset into the first sheet (0-based). Labels before this index stay blank.
   */
  startPosition?: number;
}

/**
 * Renders one or more A4 sheets with labels positioned using the template's
 * physical measurements. Splits into multiple <section> pages when the number
 * of cells + startPosition exceeds labelsPerSheet.
 *
 * IMPORTANT: uses `position: relative` on each sheet (normal document flow),
 * NOT `position: fixed`. Fixed elements do not paginate — they repeat on every
 * printed page — which breaks multi-sheet jobs. The `page-break-after: always`
 * rule on `.label-sheet` in globals.css drives pagination.
 */
export function LabelSheet({
  template,
  cells,
  startPosition = 0,
}: LabelSheetProps) {
  // Nothing to print — render nothing rather than a blank sheet.
  // Important during the batch page's loading state to avoid a flash.
  if (cells.length === 0) {
    return null;
  }

  // Slot layout: pad with `null` at the front so startPosition offsets correctly.
  const slots: Array<LabelCell | null> = [
    ...Array.from({ length: startPosition }, () => null),
    ...cells,
  ];

  // Chunk into per-sheet pages of template.labelsPerSheet.
  const sheets: Array<Array<LabelCell | null>> = [];
  for (let i = 0; i < slots.length; i += template.labelsPerSheet) {
    sheets.push(slots.slice(i, i + template.labelsPerSheet));
  }

  return (
    <>
      {sheets.map((sheetCells, sheetIndex) => (
        <section
          key={sheetIndex}
          className="label-sheet"
          style={{
            position: 'relative',
            width: `${template.pageWidthMm}mm`,
            height: `${template.pageHeightMm}mm`,
            background: '#fff',
            overflow: 'hidden',
          }}
        >
          {sheetCells.map((cell, indexInSheet) => {
            if (!cell) return null;
            const { topMm, leftMm } = getCellPosition(template, indexInSheet);
            return (
              <div
                key={`${sheetIndex}-${indexInSheet}`}
                style={{
                  position: 'absolute',
                  top: `${topMm}mm`,
                  left: `${leftMm}mm`,
                  width: `${template.labelWidthMm}mm`,
                  height: `${template.labelHeightMm}mm`,
                  overflow: 'hidden',
                }}
              >
                <LabelContent
                  equipment={cell.equipment}
                  qrUrl={cell.qrUrl}
                  widthMm={template.labelWidthMm}
                  heightMm={template.labelHeightMm}
                />
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
