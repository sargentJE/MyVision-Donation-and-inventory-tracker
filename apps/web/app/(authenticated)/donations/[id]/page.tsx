'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDonation, useToggleAcknowledge } from '@/hooks/use-donations';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/date-utils';
import { StatusBadge } from '@/components/equipment/status-badge';
import { ConditionBadge } from '@/components/equipment/condition-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle } from 'lucide-react';

export default function DonationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { data, isLoading, refetch } = useDonation(params.id);
  const toggleAcknowledge = useToggleAcknowledge();

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

  const donation = data?.data;
  if (!donation) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Donation Not Found</h1>
        <Button variant="outline" onClick={() => router.push('/donations')}>Back to Donations</Button>
      </div>
    );
  }

  async function handleToggle() {
    try {
      await toggleAcknowledge.mutateAsync(params.id);
      refetch();
      toast({ title: 'Acknowledgement updated' });
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{donation.donorName}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {donation.donorOrg && <span>{donation.donorOrg}</span>}
            <span>Donated {formatDate(donation.donatedAt)}</span>
          </div>
        </div>
        <Button
          variant={donation.acknowledgementSent ? 'outline' : 'default'}
          size="sm"
          onClick={handleToggle}
          disabled={toggleAcknowledge.isPending}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {donation.acknowledgementSent ? 'Acknowledged' : 'Mark Acknowledged'}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {donation.acknowledgementSent ? (
          <Badge className="bg-green-100 text-green-800">Acknowledgement Sent</Badge>
        ) : (
          <Badge variant="outline">Pending Acknowledgement</Badge>
        )}
      </div>

      {donation.notes && (
        <>
          <Separator />
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">Notes</h2>
            <p className="text-sm">{donation.notes}</p>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Linked Equipment ({donation.items.length})
        </h2>
        {donation.items.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table aria-label="Equipment linked to this donation">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="hidden sm:table-cell">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donation.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link href={`/equipment/${item.id}`} className="font-medium text-primary hover:underline">
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell><ConditionBadge condition={item.condition} /></TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(item.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No equipment linked to this donation yet.
          </p>
        )}
      </div>
    </div>
  );
}
