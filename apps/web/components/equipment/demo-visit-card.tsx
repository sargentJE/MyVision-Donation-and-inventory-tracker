'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useReturnDemoVisit } from '@/hooks/use-demo-visits';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, Undo2 } from 'lucide-react';
import { formatDate, daysElapsed } from '@/lib/date-utils';

interface DemoVisitCardProps {
  data: Record<string, unknown>;
  equipmentId: string;
  onActionComplete: () => void;
}

const returnDemoSchema = z.object({
  conditionOnReturn: z.string().optional(),
  conditionOnReturnNotes: z.string().optional(),
});

export function DemoVisitCard({ data, equipmentId, onActionComplete }: DemoVisitCardProps) {
  const { toast } = useToast();
  const [showReturn, setShowReturn] = useState(false);
  const returnVisit = useReturnDemoVisit();

  const visitId = data.id as string;
  const destination = data.destination as string | null;
  const startedAt = data.startedAt as string;
  const expectedReturn = data.expectedReturn as string | null;
  const isOverdue = expectedReturn ? new Date(expectedReturn) < new Date() : false;

  const returnForm = useForm<z.infer<typeof returnDemoSchema>>({
    resolver: zodResolver(returnDemoSchema),
    defaultValues: { conditionOnReturn: '', conditionOnReturnNotes: '' },
  });

  function closeReturn() {
    setShowReturn(false);
    returnForm.reset();
  }

  return (
    <>
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-myvision-blue" />
          <span className="text-sm font-medium text-myvision-blue">On Demo Visit</span>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">Overdue</Badge>
          )}
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {destination && (
            <div>
              <span className="text-muted-foreground">Destination: </span>
              <span>{destination}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Started: </span>
            <span>{formatDate(startedAt)}</span>
            <span className="text-xs text-muted-foreground ml-1">
              ({daysElapsed(startedAt)} days ago)
            </span>
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

        <div className="pt-1">
          <Button size="sm" onClick={() => setShowReturn(true)}>
            <Undo2 className="mr-1 h-4 w-4" />
            Return from Demo
          </Button>
        </div>
      </div>

      <Dialog open={showReturn} onOpenChange={(o) => !o && closeReturn()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return from Demo Visit</DialogTitle>
          </DialogHeader>
          <Form {...returnForm}>
            <form onSubmit={returnForm.handleSubmit(async (values) => {
              try {
                await returnVisit.mutateAsync({
                  id: visitId,
                  conditionOnReturn: values.conditionOnReturn || undefined,
                  conditionOnReturnNotes: values.conditionOnReturnNotes || undefined,
                });
                closeReturn();
                toast({ title: 'Demo visit returned' });
                onActionComplete();
              } catch {
                toast({ title: 'Failed to return', variant: 'destructive' });
              }
            })} className="space-y-4">
              <FormField control={returnForm.control} name="conditionOnReturn" render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition on Return</FormLabel>
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
              <FormField control={returnForm.control} name="conditionOnReturnNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Notes (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeReturn}>Cancel</Button>
                <Button type="submit" disabled={returnVisit.isPending}>
                  {returnVisit.isPending ? 'Returning...' : 'Confirm Return'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
