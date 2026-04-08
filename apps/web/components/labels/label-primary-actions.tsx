'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LabelTemplate } from '@/lib/label-templates';
import { LabelPrintInstructions } from './label-print-instructions';

interface LabelPrimaryActionsProps {
  template: LabelTemplate;
  /** Label shown on the print button (e.g. "Print 21 labels"). */
  printLabel: string;
  /** Disable the print button (e.g. while data is loading). */
  printDisabled?: boolean;
}

/**
 * Action row that lives directly under the paper preview on desktop.
 *
 * Renders the page's primary action (Print) at large size with a
 * companion `(?)` instructions popover trigger to its right. Hidden on
 * mobile (`hidden lg:flex`) — mobile uses the sticky bottom button
 * defined inside each label page.
 *
 * Putting the Print button next to the preview means the user reads the
 * preview, decides "yes", and clicks Print without their eyes (or mouse)
 * having to travel back up to the toolbar.
 */
export function LabelPrimaryActions({
  template,
  printLabel,
  printDisabled,
}: LabelPrimaryActionsProps) {
  return (
    <div className="hidden lg:flex items-center gap-2 no-print">
      <Button
        size="lg"
        className="flex-1"
        onClick={() => window.print()}
        disabled={printDisabled}
      >
        <Printer className="mr-2 h-4 w-4" />
        {printLabel}
      </Button>
      <LabelPrintInstructions template={template} />
    </div>
  );
}
