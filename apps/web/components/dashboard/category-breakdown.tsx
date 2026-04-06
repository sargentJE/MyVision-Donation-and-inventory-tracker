/**
 * Horizontal proportional bars showing equipment count per device category.
 * Pure CSS — no chart library. Single colour for neutral comparison.
 */

const CATEGORY_LABELS: Record<string, string> = {
  DIGITAL_MAGNIFIER: 'Digital Magnifier',
  CCTV_MAGNIFIER: 'CCTV Magnifier',
  TEXT_TO_SPEECH: 'Text to Speech',
  SMARTPHONE: 'Smartphone',
  TABLET: 'Tablet',
  MONITOR: 'Monitor',
  OTHER: 'Other',
};

interface CategoryBreakdownProps {
  byCategory: Record<string, number>;
}

export function CategoryBreakdown({ byCategory }: CategoryBreakdownProps) {
  const entries = Object.entries(byCategory)
    .map(([key, count]) => ({
      key,
      label: CATEGORY_LABELS[key] ?? key.replace(/_/g, ' '),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const maxCount = entries[0]?.count ?? 1;

  const ariaLabel = entries
    .map((e) => `${e.count} ${e.label}`)
    .join(', ');

  if (entries.length === 0) {
    return (
      <div className="rounded-md border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Equipment by Type
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No equipment yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Equipment by Type
      </h3>

      <div
        role="img"
        aria-label={`Equipment by type: ${ariaLabel}`}
        className="space-y-2.5"
      >
        {entries.map((entry) => (
          <div key={entry.key} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm text-muted-foreground truncate">
              {entry.label}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(entry.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-sm font-medium">
              {entry.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
