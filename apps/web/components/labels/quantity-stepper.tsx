'use client';

import { useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QuantityStepperProps {
  /** Current value (controlled). Will be clamped to [min, max] internally. */
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  /** Optional secondary action label, e.g. "Fill sheet". */
  fillLabel?: string;
  onFill?: () => void;
  /** Form label text shown above the controls. Defaults to "Quantity". */
  label?: string;
  /** Optional id for the input. If omitted, a unique React `useId` is used
   *  so multiple instances on the same page never collide. */
  id?: string;
}

/**
 * `[−] [n] [+]` numeric stepper with optional secondary "Fill" action.
 *
 * Clamps invalid input to `[min, max]` and floors fractional values, so
 * the rendered input always reflects the canonical value. Designed
 * specifically for low-volume integer entry (label quantities) — for
 * larger ranges or sliders, reach for a different control.
 *
 * Reused by both label print pages; lives in `components/labels/` because
 * it's the only consumer today, but the props are deliberately generic so
 * it can move to `components/ui/` if a second use case arrives.
 */
export function QuantityStepper({
  value,
  min,
  max,
  onChange,
  fillLabel,
  onFill,
  label = 'Quantity',
  id,
}: QuantityStepperProps) {
  // Stable, unique id per instance — falls back to React's useId so two
  // steppers on the same page never collide on form-control linkage.
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const rangeId = `${inputId}-range`;

  const clamp = (next: number) => {
    if (!Number.isFinite(next)) return min;
    return Math.max(min, Math.min(max, Math.floor(next)));
  };

  const handleChange = (next: number) => {
    const clamped = clamp(next);
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handleChange(value - 1)}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-20 text-center"
          aria-describedby={rangeId}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handleChange(value + 1)}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
        {fillLabel && onFill && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFill}
          >
            {fillLabel}
          </Button>
        )}
      </div>
      <span id={rangeId} className="text-xs text-muted-foreground">
        Between {min} and {max}.
      </span>
    </div>
  );
}
