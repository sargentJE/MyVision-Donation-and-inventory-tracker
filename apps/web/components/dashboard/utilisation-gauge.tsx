/**
 * Linear progress bar showing loanable stock utilisation.
 * Pure CSS — no chart library.
 */

interface UtilisationGaugeProps {
  totalGiveable: number;
  inUse: number;
  available: number;
  utilisation: number;
}

export function UtilisationGauge({
  totalGiveable,
  inUse,
  available,
  utilisation,
}: UtilisationGaugeProps) {
  if (totalGiveable === 0) {
    return (
      <div className="rounded-md border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Loanable Stock Usage
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No loanable stock yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-4 space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Loanable Stock Usage
      </h3>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">{utilisation}%</span>
        <span className="text-sm text-muted-foreground">utilised</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={utilisation}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Loanable stock utilisation: ${utilisation}%`}
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${utilisation}%` }}
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{inUse}</span> in use
        </span>
        <span>
          <span className="font-medium text-foreground">{available}</span> available
        </span>
        <span>
          of <span className="font-medium text-foreground">{totalGiveable}</span> loanable
        </span>
      </div>
    </div>
  );
}
