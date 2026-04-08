'use client';

import { LabelContent, type LabelEquipment } from './label-content';

interface BaseCellProps {
  topMm: number;
  leftMm: number;
  widthMm: number;
  heightMm: number;
  /** 1-based cell number within its sheet, used for the screen overlay. */
  cellNumber: number;
}

interface FilledCellProps extends BaseCellProps {
  equipment: LabelEquipment;
  qrUrl: string;
}

/**
 * A cell on a label sheet that holds a real label. Renders the LabelContent
 * (logo + name + meta + QR) and a small `.screen-only` cell-number overlay
 * in the top-left corner so users can correlate the preview with the
 * start-position picker. The overlay is stripped in print.
 */
export function LabelCellFilled({
  topMm,
  leftMm,
  widthMm,
  heightMm,
  cellNumber,
  equipment,
  qrUrl,
}: FilledCellProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: `${topMm}mm`,
        left: `${leftMm}mm`,
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        overflow: 'hidden',
      }}
    >
      <LabelContent
        equipment={equipment}
        qrUrl={qrUrl}
        widthMm={widthMm}
        heightMm={heightMm}
      />
      <span
        className="screen-only"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '0.8mm',
          left: '1.2mm',
          fontSize: '6pt',
          color: 'rgba(0,0,0,0.28)',
          fontFamily: 'system-ui, sans-serif',
          pointerEvents: 'none',
        }}
      >
        {cellNumber}
      </span>
    </div>
  );
}

/**
 * A blank cell on a label sheet — die-cut outline visible in the screen
 * preview only (so the user can see the full sheet shape and reason about
 * which cells stay empty), but stripped in print so the physical sticker
 * sheet truly stays blank.
 */
export function LabelCellBlank({
  topMm,
  leftMm,
  widthMm,
  heightMm,
  cellNumber,
}: BaseCellProps) {
  return (
    <div
      className="screen-only"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: `${topMm}mm`,
        left: `${leftMm}mm`,
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        overflow: 'hidden',
        border: '1px dashed rgba(0,0,0,0.18)',
        borderRadius: '1mm',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '1mm',
          left: '1.5mm',
          fontSize: '6pt',
          color: 'rgba(0,0,0,0.25)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {cellNumber}
      </span>
    </div>
  );
}
