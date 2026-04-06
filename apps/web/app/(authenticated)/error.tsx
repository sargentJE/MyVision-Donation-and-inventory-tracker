'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        This page encountered an error. Your data is safe.
      </p>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload page
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
