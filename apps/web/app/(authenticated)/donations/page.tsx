'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDonations, useToggleAcknowledge } from '@/hooks/use-donations';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import { Gift, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { TableEmptyState } from '@/components/shared/table-empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DonationsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const toggleAcknowledge = useToggleAcknowledge();

  const { data, isLoading } = useDonations({
    page,
    pageSize: 25,
    acknowledgementSent: showAcknowledged ? undefined : false,
  });

  const donations = data?.data ?? [];
  const meta = data?.meta;

  async function handleToggle(id: string, donorName: string) {
    try {
      await toggleAcknowledge.mutateAsync(id);
      toast({ title: `Acknowledgement toggled for ${donorName}` });
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Donations</h1>

      <div className="flex items-center gap-2">
        <Checkbox
          id="show-acknowledged"
          checked={showAcknowledged}
          onCheckedChange={(v) => {
            setShowAcknowledged(v === true);
            setPage(1);
          }}
        />
        <Label htmlFor="show-acknowledged" className="text-sm">
          Show acknowledged
        </Label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div role="status" aria-label="Loading">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table aria-label="Donations list">
              <TableHeader>
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead className="hidden sm:table-cell">Organisation</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead>Acknowledged</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`/donations/${d.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {d.donorName}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {d.donorOrg ?? '—'}
                    </TableCell>
                    <TableCell>{formatDate(d.donatedAt)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary">{d.itemCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {d.acknowledgementSent ? (
                        <Badge className="bg-green-100 text-green-800">Sent</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(d.id, d.donorName)}
                        disabled={toggleAcknowledge.isPending}
                        aria-label={d.acknowledgementSent ? `Mark acknowledgement as not sent for ${d.donorName}` : `Mark acknowledgement as sent for ${d.donorName}`}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {donations.length === 0 && (
                  <TableEmptyState
                    colSpan={6}
                    icon={Gift}
                    message="No donation records. Donations are created when adding donated equipment."
                  />
                )}
              </TableBody>
            </Table>
          </div>

          {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
