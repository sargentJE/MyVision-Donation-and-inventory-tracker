/**
 * Label sheet templates.
 *
 * Adding a new Avery / QConnect product is a data change — add an entry
 * to LABEL_TEMPLATES and update the id union type.
 *
 * All measurements in millimetres. Page size is A4 (210 × 297).
 */

export type LabelTemplateId = 'avery-l7160' | 'qconnect-14';

export interface LabelTemplate {
  id: LabelTemplateId;
  name: string;
  brand: string;
  labelsPerSheet: number;
  cols: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
  topMarginMm: number;
  leftMarginMm: number;
  colGapMm: number;
  rowGapMm: number;
}

export const LABEL_TEMPLATES: Record<LabelTemplateId, LabelTemplate> = {
  'avery-l7160': {
    id: 'avery-l7160',
    name: 'Avery L7160 — 21 per sheet',
    brand: 'Avery',
    labelsPerSheet: 21,
    cols: 3,
    rows: 7,
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    pageWidthMm: 210,
    pageHeightMm: 297,
    topMarginMm: 15.1,
    leftMarginMm: 7.2,
    colGapMm: 2.5,
    rowGapMm: 0,
  },
  // QConnect 14-per-sheet (2 cols × 7 rows, 99.1 × 38.1mm). Compatible with
  // Avery L7163 which QConnect commonly clones.
  // Horizontal: 4.65 + 99.1 + 2.5 + 99.1 + 4.65 = 210 ✓
  // Vertical:   15.15 + (7 × 38.1) + 15.15 = 297 ✓
  'qconnect-14': {
    id: 'qconnect-14',
    name: 'QConnect 14 per sheet (L7163 equiv.)',
    brand: 'QConnect',
    labelsPerSheet: 14,
    cols: 2,
    rows: 7,
    labelWidthMm: 99.1,
    labelHeightMm: 38.1,
    pageWidthMm: 210,
    pageHeightMm: 297,
    topMarginMm: 15.15,
    leftMarginMm: 4.65,
    colGapMm: 2.5,
    rowGapMm: 0,
  },
};

export const DEFAULT_TEMPLATE_ID: LabelTemplateId = 'avery-l7160';

export const ALL_TEMPLATES: LabelTemplate[] = Object.values(LABEL_TEMPLATES);

export function isLabelTemplateId(value: string): value is LabelTemplateId {
  return value in LABEL_TEMPLATES;
}

/** Compute {top, left} in mm for a cell index within a single sheet. */
export function getCellPosition(
  template: LabelTemplate,
  indexInSheet: number,
): { topMm: number; leftMm: number } {
  const row = Math.floor(indexInSheet / template.cols);
  const col = indexInSheet % template.cols;
  return {
    topMm:
      template.topMarginMm +
      row * (template.labelHeightMm + template.rowGapMm),
    leftMm:
      template.leftMarginMm +
      col * (template.labelWidthMm + template.colGapMm),
  };
}
