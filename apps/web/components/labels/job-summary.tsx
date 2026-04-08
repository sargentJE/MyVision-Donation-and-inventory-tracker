'use client';

import { FileText, Layers, LayoutGrid } from 'lucide-react';
import { summarisePrintJob } from '@/lib/label-job';
import type { LabelTemplate } from '@/lib/label-templates';

interface JobSummaryProps {
  cellCount: number;
  startPosition: number;
  template: LabelTemplate;
}

/**
 * Three small stat tiles summarising the print job.
 *
 *   ┌──────────┐ ┌──────────┐ ┌──────────┐
 *   │  Sheets  │ │  Labels  │ │  Cells   │
 *   │    1     │ │    3     │ │ 3 of 21  │
 *   └──────────┘ └──────────┘ └──────────┘
 *
 * Mirrors the dashboard `MetricCard` pattern (icon + small label + larger
 * number) so the page reads as part of the same design system. Sits above
 * the paper preview as the "what am I about to print" headline.
 *
 * `aria-live="polite"` on the row so screen readers announce updates as
 * the user adjusts quantity or template.
 */
export function JobSummary({
  cellCount,
  startPosition,
  template,
}: JobSummaryProps) {
  const job = summarisePrintJob({
    cellCount,
    startPosition,
    labelsPerSheet: template.labelsPerSheet,
  });

  // The third stat tells the user how the labels are laid out on the
  // sticker sheet. For single-sheet jobs that's "N of M used"; for
  // multi-sheet jobs it's how many cells the last (partial) sheet uses,
  // which is the bit users actually need to know to predict spillover.
  const lastSheetUsed = job.empty
    ? 0
    : job.multiSheet
      ? ((startPosition + cellCount - 1) % template.labelsPerSheet) + 1
      : cellCount;

  const layoutStatLabel = job.multiSheet ? 'Last sheet' : 'Cells used';
  const layoutStatValue = job.empty
    ? '—'
    : `${lastSheetUsed} of ${template.labelsPerSheet}`;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="grid grid-cols-3 gap-2"
    >
      <Stat icon={Layers} label="Sheets" value={job.empty ? '—' : String(job.sheets)} />
      <Stat icon={FileText} label="Labels" value={job.empty ? '—' : String(job.labels)} />
      <Stat icon={LayoutGrid} label={layoutStatLabel} value={layoutStatValue} />
    </div>
  );
}

interface StatProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function Stat({ icon: Icon, label, value }: StatProps) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
