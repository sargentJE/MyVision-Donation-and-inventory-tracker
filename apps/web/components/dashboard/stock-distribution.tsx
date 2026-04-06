/**
 * GitHub-style stacked horizontal bar showing equipment count per status.
 * Pure CSS — no chart library.
 */

const STATUS_CONFIG: {
  key: string;
  label: string;
  colour: string;
  dot: string;
}[] = [
  { key: 'AVAILABLE_FOR_LOAN', label: 'Available for Loan', colour: 'bg-green-500', dot: 'bg-green-500' },
  { key: 'RESERVED', label: 'Reserved', colour: 'bg-amber-500', dot: 'bg-amber-500' },
  { key: 'ON_LOAN', label: 'On Loan', colour: 'bg-blue-500', dot: 'bg-blue-500' },
  { key: 'ALLOCATED_OUT', label: 'Allocated Out', colour: 'bg-purple-500', dot: 'bg-purple-500' },
  { key: 'AVAILABLE_FOR_DEMO', label: 'Available for Demo', colour: 'bg-emerald-400', dot: 'bg-emerald-400' },
  { key: 'ON_DEMO_VISIT', label: 'On Demo Visit', colour: 'bg-sky-500', dot: 'bg-sky-500' },
  { key: 'DECOMMISSIONED', label: 'Decommissioned', colour: 'bg-red-500', dot: 'bg-red-500' },
];

interface StockDistributionProps {
  total: number;
  byStatus: Record<string, number>;
}

export function StockDistribution({ total, byStatus }: StockDistributionProps) {
  const segments = STATUS_CONFIG
    .filter((s) => (byStatus[s.key] ?? 0) > 0)
    .map((s) => ({ ...s, count: byStatus[s.key] ?? 0 }));

  const ariaLabel = segments
    .map((s) => `${s.count} ${s.label}`)
    .join(', ');

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Stock Distribution
        </h3>
        <span className="text-2xl font-bold">{total}</span>
      </div>

      {/* Stacked bar */}
      <div
        role="img"
        aria-label={`Equipment distribution: ${ariaLabel}`}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={`${segment.colour} transition-all`}
            style={{ flex: segment.count }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-1.5 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${segment.dot}`} />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium">{segment.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
