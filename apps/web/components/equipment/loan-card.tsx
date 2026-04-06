'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useReturnLoan, useConvertLoanToAllocation } from '@/hooks/use-loans';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HandCoins, Undo2, ArrowRight } from 'lucide-react';
import { formatDate, daysElapsed } from '@/lib/date-utils';

interface LoanCardProps {
  data: Record<string, unknown>;
  equipmentId: string;
  onActionComplete: () => void;
}

const returnLoanSchema = z.object({
  conditionAtReturn: z.string().optional(),
  notes: z.string().optional(),
});

export function LoanCard({ data, equipmentId, onActionComplete }: LoanCardProps) {
  const { toast } = useToast();
  const [showReturn, setShowReturn] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const returnLoan = useReturnLoan();
  const convertLoan = useConvertLoanToAllocation();

  const loanId = data.id as string;
  const client = data.client as { id: string; displayName: string; charitylogId: string } | undefined;
  const loanedAt = data.loanedAt as string;
  const expectedReturn = data.expectedReturn as string | null;
  const isOverdue = expectedReturn ? new Date(expectedReturn) < new Date() : false;

  const returnForm = useForm<z.infer<typeof returnLoanSchema>>({
    resolver: zodResolver(returnLoanSchema),
    defaultValues: { conditionAtReturn: '', notes: '' },
  });

  function closeReturn() {
    setShowReturn(false);
    returnForm.reset();
  }

  async function handleConvert() {
    try {
      await convertLoan.mutateAsync({ id: loanId });
      setShowConvert(false);
      toast({ title: 'Converted to permanent allocation' });
      onActionComplete();
    } catch {
      toast({ title: 'Failed to convert', variant: 'destructive' });
    }
  }

  return (
    <>
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-myvision-blue" />
          <span className="text-sm font-medium text-myvision-blue">On Loan</span>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">Overdue</Badge>
          )}
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
            <span className="text-muted-foreground">Loaned: </span>
            <span>{formatDate(loanedAt)}</span>
            <span className="text-xs text-muted-foreground ml-1">({daysElapsed(loanedAt)} days ago)</span>
          </div>
          {expectedReturn && (
            <div>
              <span className="text-muted-foreground">Expected return: </span>
              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                {formatDate(expectedReturn)}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => setShowReturn(true)}
          >
            <Undo2 className="mr-1 h-4 w-4" />
            Return
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowConvert(true)}
          >
            <ArrowRight className="mr-1 h-4 w-4" />
            Convert to Allocation
          </Button>
        </div>
      </div>

      {/* Return Dialog */}
      <Dialog open={showReturn} onOpenChange={(o) => !o && closeReturn()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Loan</DialogTitle>
          </DialogHeader>
          <Form {...returnForm}>
            <form onSubmit={returnForm.handleSubmit(async (values) => {
              try {
                await returnLoan.mutateAsync({
                  id: loanId,
                  conditionAtReturn: values.conditionAtReturn || undefined,
                  notes: values.notes || undefined,
                });
                closeReturn();
                toast({ title: 'Loan returned' });
                onActionComplete();
              } catch {
                toast({ title: 'Failed to return', variant: 'destructive' });
              }
            })} className="space-y-4">
              <FormField control={returnForm.control} name="conditionAtReturn" render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition at Return</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Not assessed" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="FAIR">Fair</SelectItem>
                      <SelectItem value="POOR">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={returnForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeReturn}>Cancel</Button>
                <Button type="submit" disabled={returnLoan.isPending}>
                  {returnLoan.isPending ? 'Returning...' : 'Confirm Return'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={showConvert} onOpenChange={setShowConvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Permanent Allocation</DialogTitle>
            <DialogDescription>
              This cannot be undone. The item will be permanently assigned to {client?.displayName ?? 'this client'}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvert(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConvert} disabled={convertLoan.isPending}>
              {convertLoan.isPending ? 'Converting...' : 'Convert to Allocation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
