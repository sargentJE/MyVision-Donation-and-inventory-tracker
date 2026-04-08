'use client';

import { Fragment } from 'react';
import {
  getCellPosition,
  type LabelTemplate,
} from '@/lib/label-templates';
import { LabelCellBlank, LabelCellFilled } from './label-cell';
import type { LabelEquipment } from './label-content';

export interface LabelCell {
  equipment: LabelEquipment;
  qrUrl: string;
}

interface LabelSheetProps {
  template: LabelTemplate;
  /** Labels to place, in order. Each entry occupies one cell. */
  cells: LabelCell[];
  /**
   * Offset into the first sheet (0-based). Labels before this index stay blank.
   */
  startPosition?: number;
}

/**
 * Renders one or more A4 sheets at template-accurate physical dimensions.
 *
 * Splits into multiple <section> pages when the cell count plus
 * `startPosition` exceeds `template.labelsPerSheet`. The last sheet is
 * padded with trailing blank cells so the screen preview always shows the
 * full sticker sheet outline; trailing blanks vanish in print so the
 * physical output is unchanged.
 *
 * IMPORTANT: each sheet uses `position: relative` (normal document flow),
 * NOT `position: fixed` or `position: absolute`. The page-break-after rule
 * on `.label-sheet` in `globals.css` drives multi-sheet pagination, and
 * page-break does not work reliably across browsers when the ancestor is
 * absolutely positioned. The print-tree's body-portal isolation in
 * `LabelPrintView` is what makes this safe.
 */
export function LabelSheet({
  template,
  cells,
  startPosition = 0,
}: LabelSheetProps) {
  // Nothing to render — render nothing rather than a blank sheet.
  // Important during the batch page's loading state to avoid a flash.
  if (cells.length === 0) {
    return null;
  }

  const sheets = chunkIntoSheets(cells, startPosition, template.labelsPerSheet);
  const multiSheet = sheets.length > 1;

  return (
    <>
      {sheets.map((sheetCells, sheetIndex) => (
        <Fragment key={sheetIndex}>
          {multiSheet && sheetIndex > 0 && (
            <SheetSeparator
              sheetIndex={sheetIndex}
              total={sheets.length}
              widthMm={template.pageWidthMm}
            />
          )}
          <section
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
              const { topMm, leftMm } = getCellPosition(template, indexInSheet);
              const cellNumber = indexInSheet + 1;
              const baseProps = {
                topMm,
                leftMm,
                widthMm: template.labelWidthMm,
                heightMm: template.labelHeightMm,
                cellNumber,
              };

              if (!cell) {
                return (
                  <LabelCellBlank
                    key={`blank-${sheetIndex}-${indexInSheet}`}
                    {...baseProps}
                  />
                );
              }

              return (
                <LabelCellFilled
                  key={`${sheetIndex}-${indexInSheet}`}
                  {...baseProps}
                  equipment={cell.equipment}
                  qrUrl={cell.qrUrl}
                />
              );
            })}
          </section>
        </Fragment>
      ))}
    </>
  );
}

/**
 * Chunk a flat list of cells (with leading start-position offset) into
 * per-sheet pages of `labelsPerSheet`. Pads the last sheet with trailing
 * `null`s so it always shows the full sheet outline in the screen preview.
 */
function chunkIntoSheets(
  cells: LabelCell[],
  startPosition: number,
  labelsPerSheet: number,
): Array<Array<LabelCell | null>> {
  // Pad the front with `null`s for the start-position offset.
  const slots: Array<LabelCell | null> = [
    ...Array.from({ length: startPosition }, () => null),
    ...cells,
  ];

  const sheets: Array<Array<LabelCell | null>> = [];
  for (let i = 0; i < slots.length; i += labelsPerSheet) {
    sheets.push(slots.slice(i, i + labelsPerSheet));
  }

  // Pad the last sheet up to a full page so the screen preview always
  // shows the complete sticker sheet outline. Trailing blanks render as
  // dashed `.screen-only` outlines and vanish in print.
  const lastSheet = sheets[sheets.length - 1];
  while (lastSheet.length < labelsPerSheet) {
    lastSheet.push(null);
  }

  return sheets;
}

interface SheetSeparatorProps {
  sheetIndex: number;
  total: number;
  widthMm: number;
}

function SheetSeparator({ sheetIndex, total, widthMm }: SheetSeparatorProps) {
  return (
    <div
      className="screen-only"
      aria-hidden="true"
      style={{
        width: `${widthMm}mm`,
        padding: '4mm 0',
        borderTop: '2px dashed rgba(0,0,0,0.2)',
        marginTop: '2mm',
        marginBottom: '2mm',
        fontSize: '10pt',
        textAlign: 'center',
        color: 'rgba(0,0,0,0.55)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      Sheet {sheetIndex + 1} of {total}
    </div>
  );
}
