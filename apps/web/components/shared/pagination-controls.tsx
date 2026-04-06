'use client';

import { Button } from '@/components/ui/button';

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface PaginationControlsProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ meta, onPageChange }: PaginationControlsProps) {
  if (meta.totalPages <= 1) return null;

  const start = (meta.page - 1) * meta.pageSize + 1;
  const end = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <span className="sr-only">Page {meta.page} of {meta.totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          aria-label="Go to previous page"
          onClick={() => onPageChange(Math.max(1, meta.page - 1))}
          disabled={meta.page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Go to next page"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
