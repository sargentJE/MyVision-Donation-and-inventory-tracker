'use client';

import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import type { LabelTemplate } from '@/lib/label-templates';

interface LabelPrintInstructionsProps {
  template: LabelTemplate;
}

/**
 * Print-dialog instructions, presented as a `(?)` icon button that opens
 * a Popover. Read-once-then-forgotten content shouldn't permanently
 * occupy screen real estate — it earns its space only on demand.
 *
 * Lives next to the Print button in `LabelPrimaryActions` so help is one
 * thumb-flick away from the action it qualifies. Reuses the existing
 * Radix Popover primitive (no new dependency).
 *
 * Copy uses `template.shortName` (e.g. "Avery L7160") to avoid the
 * "sheet sheet" duplication that happens when concatenating with the
 * verbose template name.
 */
export function LabelPrintInstructions({
  template,
}: LabelPrintInstructionsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Show print instructions"
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium">How to print correctly</p>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Load one {template.shortName} sheet into your printer.</li>
            <li>Click the Print button.</li>
            <li>
              In the print dialog, set <strong>Scale 100%</strong> and{' '}
              <strong>Margins: None</strong>.
            </li>
          </ol>
        </div>
      </PopoverContent>
    </Popover>
  );
}
