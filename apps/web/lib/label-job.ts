/**
 * Pure helpers for summarising a label print job.
 *
 * Lives in lib/ rather than alongside the React components because they're
 * pure functions that have no UI concern — they're easier to reason about
 * (and unit-test, when web gets a Jest setup) when isolated from React.
 */

export interface PrintJobShape {
  /** Number of label-bearing cells (0..N). */
  cellCount: number;
  /** Zero-based offset into the first sheet (skip-cells before the first label). */
  startPosition: number;
  /** Cells per sheet for the chosen template. */
  labelsPerSheet: number;
}

export interface PrintJobSummary {
  /** Total sheets the job will print on (≥ 1 unless empty). */
  sheets: number;
  /** Number of labels — same as cellCount, kept here for symmetry. */
  labels: number;
  /** Cells per sheet, echoed for callers that don't have the template handy. */
  cellsPerSheet: number;
  /** Convenience flag — true when the job spills onto more than one sheet. */
  multiSheet: boolean;
  /** True when the job has no cells at all. */
  empty: boolean;
}

/**
 * Compute a structured summary of a print job (sheet count, label count,
 * spillover, etc).
 *
 * Examples (labelsPerSheet = 21):
 *   summarisePrintJob({ cellCount: 0,  startPosition: 0,  labelsPerSheet: 21 })
 *     → { sheets: 0, labels: 0, multiSheet: false, empty: true }
 *   summarisePrintJob({ cellCount: 3,  startPosition: 0,  labelsPerSheet: 21 })
 *     → { sheets: 1, labels: 3, multiSheet: false, empty: false }
 *   summarisePrintJob({ cellCount: 25, startPosition: 0,  labelsPerSheet: 21 })
 *     → { sheets: 2, labels: 25, multiSheet: true,  empty: false }
 *   summarisePrintJob({ cellCount: 5,  startPosition: 18, labelsPerSheet: 21 })
 *     → { sheets: 2, labels: 5,  multiSheet: true,  empty: false }  // spills over
 */
export function summarisePrintJob(input: PrintJobShape): PrintJobSummary {
  const { cellCount, startPosition, labelsPerSheet } = input;

  if (cellCount === 0) {
    return {
      sheets: 0,
      labels: 0,
      cellsPerSheet: labelsPerSheet,
      multiSheet: false,
      empty: true,
    };
  }

  const totalSlots = startPosition + cellCount;
  const sheets = Math.max(1, Math.ceil(totalSlots / labelsPerSheet));

  return {
    sheets,
    labels: cellCount,
    cellsPerSheet: labelsPerSheet,
    multiSheet: sheets > 1,
    empty: false,
  };
}
