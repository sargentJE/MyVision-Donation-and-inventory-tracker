'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface LabelPrintToolbarProps {
  /** Label shown next to the printer icon. */
  printLabel: string;
  /** Disable the print button (e.g. while data is loading). */
  printDisabled?: boolean;
  /** Custom back-button label; defaults to "Back". */
  backLabel?: string;
}

/**
 * Top-of-page toolbar shared by the single-item and batch label print pages.
 * Renders a "Back" button (router.back()) on the left and a "Print" button
 * (window.print()) on the right. Both pages had identical markup before this
 * extraction.
 */
export function LabelPrintToolbar({
  printLabel,
  printDisabled,
  backLabel = 'Back',
}: LabelPrintToolbarProps) {
  const router = useRouter();
  return (
    <div className="no-print flex items-center justify-between mb-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {backLabel}
      </Button>
      <Button onClick={() => window.print()} disabled={printDisabled}>
        <Printer className="mr-2 h-4 w-4" />
        {printLabel}
      </Button>
    </div>
  );
}
