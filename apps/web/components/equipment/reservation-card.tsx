'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCancelReservation, useConvertReservation } from '@/hooks/use-reservations';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, X, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';

interface ReservationCardProps {
  data: Record<string, unknown>;
  equipmentId: string;
  onActionComplete: () => void;
}

export function ReservationCard({ data, equipmentId, onActionComplete }: ReservationCardProps) {
  const { toast } = useToast();
  const [showCancel, setShowCancel] = useState(false);
  const cancelReservation = useCancelReservation();
  const convertReservation = useConvertReservation();

  const reservationId = data.id as string;
  const client = data.client as { id: string; displayName: string; charitylogId: string } | undefined;
  const reservedAt = data.reservedAt as string;
  const expiresAt = data.expiresAt as string | null;

  async function handleCancel() {
    try {
      await cancelReservation.mutateAsync(reservationId);
      setShowCancel(false);
      toast({ title: 'Reservation cancelled' });
      onActionComplete();
    } catch {
      toast({ title: 'Failed to cancel', variant: 'destructive' });
    }
  }

  async function handleConvert() {
    try {
      await convertReservation.mutateAsync({ id: reservationId });
      toast({ title: 'Converted to loan' });
      onActionComplete();
    } catch {
      toast({ title: 'Failed to convert', variant: 'destructive' });
    }
  }

  return (
    <>
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-myvision-navy" />
          <span className="text-sm font-medium text-myvision-navy">Reserved</span>
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
            <span className="text-muted-foreground">Reserved: </span>
            <span>{formatDate(reservedAt)}</span>
          </div>
          {expiresAt && (
            <div>
              <span className="text-muted-foreground">Expires: </span>
              <span>{formatDate(expiresAt)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleConvert}
            disabled={convertReservation.isPending}
          >
            <ArrowRight className="mr-1 h-4 w-4" />
            {convertReservation.isPending ? 'Converting...' : 'Convert to Loan'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCancel(true)}
          >
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
            <DialogDescription>
              The equipment will become available for loan again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>Keep Reservation</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelReservation.isPending}>
              {cancelReservation.isPending ? 'Cancelling...' : 'Cancel Reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
