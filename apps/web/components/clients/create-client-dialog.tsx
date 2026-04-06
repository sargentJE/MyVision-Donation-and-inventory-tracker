'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateClient, type ClientSummary } from '@/hooks/use-clients';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const createClientSchema = z.object({
  charitylogId: z.string().min(1, 'CharityLog ID is required'),
  displayName: z.string().min(1, 'Display name is required'),
});

type CreateClientValues = z.infer<typeof createClientSchema>;

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: ClientSummary) => void;
}

export function CreateClientDialog({ open, onOpenChange, onCreated }: CreateClientDialogProps) {
  const { toast } = useToast();
  const createClient = useCreateClient();

  const form = useForm<CreateClientValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { charitylogId: '', displayName: '' },
  });

  function handleClose() {
    form.reset();
    onOpenChange(false);
  }

  async function onSubmit(values: CreateClientValues) {
    try {
      const result = await createClient.mutateAsync(values);
      onCreated(result.data);
      handleClose();
      toast({ title: 'Client created' });
    } catch (err: unknown) {
      const error = err as { body?: { error?: string } };
      if (error.body?.error === 'DUPLICATE_CHARITYLOG_ID') {
        form.setError('charitylogId', {
          message: 'A client with this CharityLog ID already exists',
        });
      } else {
        toast({ title: 'Failed to create client', variant: 'destructive' });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Client</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="charitylogId" render={({ field }) => (
              <FormItem>
                <FormLabel>CharityLog ID *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. CL-002" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="displayName" render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Jane D." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={createClient.isPending}>
                {createClient.isPending ? 'Creating...' : 'Create Client'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
