'use client';

import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InventorySelectionBarProps {
  count: number;
  onPrint: () => void;
  onClear: () => void;
}

/**
 * Floating action bar shown at the bottom of the inventory page when one
 * or more rows are selected. On mobile (< lg) the bar sits above the
 * fixed BottomNav (`bottom-24`); on desktop it sits at the page bottom.
 *
 * The selection count is wrapped in a `aria-live="polite"` region so
 * screen readers announce changes as the user toggles checkboxes.
 */
export function InventorySelectionBar({
  count,
  onPrint,
  onClear,
}: InventorySelectionBarProps) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label="Selected items actions"
      className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border bg-background px-4 py-2 shadow-lg"
    >
      <span className="text-sm font-medium" aria-live="polite" aria-atomic="true">
        {count} selected
      </span>
      <Button size="sm" onClick={onPrint}>
        <Printer className="mr-2 h-4 w-4" />
        Print labels
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
