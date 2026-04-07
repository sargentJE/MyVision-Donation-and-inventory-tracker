'use client';

import Link from 'next/link';
import { PackageOpen } from 'lucide-react';
import type { EquipmentSummary } from '@/hooks/use-equipment';
import { Checkbox } from '@/components/ui/checkbox';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { TableEmptyState } from '@/components/shared/table-empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from './status-badge';
import { ConditionBadge } from './condition-badge';
import { AcquisitionBadge } from './acquisition-badge';

interface EquipmentTableProps {
  data?: EquipmentSummary[];
  meta?: { total: number; page: number; pageSize: number; totalPages: number };
  isLoading: boolean;
  onPageChange: (page: number) => void;
  /**
   * Optional multi-select: if a `selection` Set is provided, the table
   * renders checkboxes (per-row + select-all-on-page header).
   */
  selection?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAllOnPage?: (ids: string[]) => void;
}

const SELECTABLE_COLSPAN = 8;
const PLAIN_COLSPAN = 7;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * The inventory list table. Used by both the "All Stock" and "For Sale"
 * tabs on the inventory page. When a `selection` Set is supplied the
 * table renders multi-select checkboxes; otherwise it renders the same
 * columns without the leading checkbox.
 */
export function EquipmentTable({
  data,
  meta,
  isLoading,
  onPageChange,
  selection,
  onToggle,
  onToggleAllOnPage,
}: EquipmentTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div role="status" aria-label="Loading">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  const items = data ?? [];
  const selectable = !!selection;
  const pageIds = items.map((i) => i.id);
  const allOnPageSelected =
    selectable &&
    pageIds.length > 0 &&
    pageIds.every((id) => selection!.has(id));
  const someOnPageSelected =
    selectable &&
    pageIds.some((id) => selection!.has(id)) &&
    !allOnPageSelected;

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table aria-label="Equipment inventory">
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all on this page"
                    checked={
                      allOnPageSelected
                        ? true
                        : someOnPageSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={() => onToggleAllOnPage?.(pageIds)}
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Make / Model</TableHead>
              <TableHead className="hidden lg:table-cell">Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Condition</TableHead>
              <TableHead className="hidden lg:table-cell">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                data-state={
                  selectable && selection!.has(item.id) ? 'selected' : undefined
                }
              >
                {selectable && (
                  <TableCell className="w-10">
                    <Checkbox
                      aria-label={`Select ${item.name}`}
                      checked={selection!.has(item.id)}
                      onCheckedChange={() => onToggle?.(item.id)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link
                    href={`/equipment/${item.id}`}
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {[item.make, item.model].filter(Boolean).join(' ') || '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {item.deviceCategory.replace(/_/g, ' ')}
                </TableCell>
                <TableCell>
                  <AcquisitionBadge acquisitionType={item.acquisitionType} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <ConditionBadge condition={item.condition} />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {formatDate(item.acquiredAt)}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableEmptyState
                colSpan={selectable ? SELECTABLE_COLSPAN : PLAIN_COLSPAN}
                icon={PackageOpen}
                message="No equipment found."
                action={{ label: 'Add Equipment', href: '/equipment/new' }}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {meta && <PaginationControls meta={meta} onPageChange={onPageChange} />}
    </>
  );
}
