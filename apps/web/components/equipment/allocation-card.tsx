'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';

interface AllocationCardProps {
  data: Record<string, unknown>;
}

export function AllocationCard({ data }: AllocationCardProps) {
  const client = data.client as { id: string; displayName: string; charitylogId: string } | undefined;
  const allocatedAt = data.allocatedAt as string;
  const originatingLoanId = data.originatingLoanId as string | null;
  const notes = data.notes as string | null;

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-myvision-navy" />
        <span className="text-sm font-medium text-myvision-navy">Permanently Allocated</span>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {client && (
          <div>
            <span className="text-muted-foreground">Client: </span>
            <Link href={`/clients/${client.id}`} className="font-medium text-primary hover:underline">
              {client.displayName}
            </Link>
            <span className="text-xs text-muted-foreground ml-1">({client.charitylogId})</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Allocated: </span>
          <span>{formatDate(allocatedAt)}</span>
        </div>
        {originatingLoanId && (
          <div>
            <span className="text-muted-foreground">From loan: </span>
            <Link href={`/loans/${originatingLoanId}`} className="text-primary hover:underline">
              View original loan
            </Link>
          </div>
        )}
        {notes && (
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Notes: </span>
            <span>{notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
