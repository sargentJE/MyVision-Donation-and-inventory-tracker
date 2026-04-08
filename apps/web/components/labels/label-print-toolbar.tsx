'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface LabelPrintToolbarProps {
  /** Custom back-button label; defaults to "Back". */
  backLabel?: string;
}

/**
 * Top-of-page back button for the single-item and batch label pages.
 *
 * The page's primary action (Print) lives elsewhere — directly under the
 * paper preview on desktop (`<LabelPrimaryActions>`) and as a sticky
 * bottom button on mobile. Putting Print next to the preview means the
 * user reads the preview, decides "yes", and clicks Print without their
 * eyes (or mouse) having to travel back up to the toolbar. The toolbar
 * is therefore reduced to navigation only.
 */
export function LabelPrintToolbar({
  backLabel = 'Back',
}: LabelPrintToolbarProps) {
  const router = useRouter();
  return (
    <div className="no-print flex items-center mb-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {backLabel}
      </Button>
    </div>
  );
}
