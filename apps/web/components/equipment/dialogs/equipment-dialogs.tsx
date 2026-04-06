'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useUpdateEquipment,
  useDecommissionEquipment,
  useArchiveEquipment,
  useReclassifyEquipment,
  type EquipmentDetail,
} from '@/hooks/use-equipment';
import { useCreateReservation } from '@/hooks/use-reservations';
import { useCreateLoan } from '@/hooks/use-loans';
import { useCreateAllocation } from '@/hooks/use-allocations';
import { useStartDemoVisit } from '@/hooks/use-demo-visits';
import { useToast } from '@/hooks/use-toast';
import { ClientTypeahead } from '@/components/clients/client-typeahead';
import type { ClientSummary } from '@/hooks/use-clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export type DialogMode =
  | { type: 'closed' }
  | { type: 'edit' }
  | { type: 'decommission' }
  | { type: 'archive' }
  | { type: 'reclassify' }
  | { type: 'reserve' }
  | { type: 'issue_loan' }
  | { type: 'allocate' }
  | { type: 'start_demo' };

interface EquipmentDialogsProps {
  equipment: EquipmentDetail;
  equipmentId: string;
  dialog: DialogMode;
  setDialog: (mode: DialogMode) => void;
  onSuccess: () => void;
}

// --- Zod Schemas ---

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  make: z.string().optional(),
  model: z.string().optional(),
  condition: z.enum(['GOOD', 'FAIR', 'POOR']),
  notes: z.string().optional(),
});

const decommissionSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

const archiveSchema = z.object({
  reason: z.string().optional(),
});

const reclassifySchema = z.object({
  acquisitionType: z.enum(['PURCHASED', 'DONATED_DEMO', 'DONATED_GIVEABLE'], {
    required_error: 'Select a new acquisition type',
  }),
  reason: z.string().min(1, 'Reason is required'),
});

const reserveSchema = z.object({
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
});

const issueLoanSchema = z.object({
  expectedReturn: z.string().optional(),
  conditionAtLoan: z.string().optional(),
  notes: z.string().optional(),
});

const allocateSchema = z.object({
  notes: z.string().optional(),
});

const startDemoSchema = z.object({
  destination: z.string().optional(),
  expectedReturn: z.string().optional(),
  notes: z.string().optional(),
});

// --- Component ---

export function EquipmentDialogs({
  equipment,
  equipmentId,
  dialog,
  setDialog,
  onSuccess,
}: EquipmentDialogsProps) {
  const { toast } = useToast();

  const updateEquipment = useUpdateEquipment();
  const decommission = useDecommissionEquipment();
  const archiveEquipment = useArchiveEquipment();
  const reclassify = useReclassifyEquipment();
  const createReservation = useCreateReservation();
  const createLoan = useCreateLoan();
  const createAllocation = useCreateAllocation();
  const startDemoVisit = useStartDemoVisit();

  // --- Forms ---

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: equipment.name,
      make: equipment.make ?? '',
      model: equipment.model ?? '',
      condition: equipment.condition as 'GOOD' | 'FAIR' | 'POOR',
      notes: equipment.notes ?? '',
    },
  });

  const decommissionForm = useForm<z.infer<typeof decommissionSchema>>({
    resolver: zodResolver(decommissionSchema),
    defaultValues: { reason: '' },
  });

  const archiveForm = useForm<z.infer<typeof archiveSchema>>({
    resolver: zodResolver(archiveSchema),
    defaultValues: { reason: '' },
  });

  const reclassifyForm = useForm<z.infer<typeof reclassifySchema>>({
    resolver: zodResolver(reclassifySchema),
    defaultValues: { acquisitionType: undefined, reason: '' },
  });

  const demoForm = useForm<z.infer<typeof startDemoSchema>>({
    resolver: zodResolver(startDemoSchema),
    defaultValues: { destination: '', expectedReturn: '', notes: '' },
  });

  // Reset forms on dialog close
  function close() {
    setDialog({ type: 'closed' });
    editForm.reset();
    decommissionForm.reset();
    archiveForm.reset();
    reclassifyForm.reset();
    demoForm.reset();
  }

  // Update edit form defaults when equipment changes
  useEffect(() => {
    if (dialog.type === 'edit') {
      editForm.reset({
        name: equipment.name,
        make: equipment.make ?? '',
        model: equipment.model ?? '',
        condition: equipment.condition as 'GOOD' | 'FAIR' | 'POOR',
        notes: equipment.notes ?? '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps — editForm.reset is stable
  }, [dialog.type, equipment]);

  return (
    <>
      {/* Edit Dialog */}
      <Dialog open={dialog.type === 'edit'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Equipment</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(async (values) => {
              try {
                await updateEquipment.mutateAsync({ id: equipmentId, ...values });
                close(); onSuccess(); toast({ title: 'Equipment updated' });
              } catch { toast({ title: 'Failed to update', variant: 'destructive' }); }
            })} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={editForm.control} name="make" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="model" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="condition" render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="FAIR">Fair</SelectItem>
                      <SelectItem value="POOR">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                <Button type="submit" disabled={updateEquipment.isPending}>{updateEquipment.isPending ? 'Saving...' : 'Save'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Decommission Dialog */}
      <Dialog open={dialog.type === 'decommission'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decommission Equipment</DialogTitle>
            <DialogDescription>This cannot be undone. The item will be permanently marked as decommissioned.</DialogDescription>
          </DialogHeader>
          <Form {...decommissionForm}>
            <form onSubmit={decommissionForm.handleSubmit(async (values) => {
              try {
                await decommission.mutateAsync({ id: equipmentId, reason: values.reason });
                close(); onSuccess(); toast({ title: 'Equipment decommissioned' });
              } catch (err: unknown) {
                const error = err as { body?: { error?: string } };
                if (error.body?.error === 'ACTIVE_DEPENDENTS') {
                  try {
                    await decommission.mutateAsync({ id: equipmentId, reason: values.reason, forceClose: true });
                    close(); onSuccess(); toast({ title: 'Equipment decommissioned', description: 'Active records were auto-closed.' });
                  } catch { toast({ title: 'Failed to decommission', variant: 'destructive' }); }
                } else { toast({ title: 'Failed to decommission', variant: 'destructive' }); }
              }
            })} className="space-y-4">
              <FormField control={decommissionForm.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={decommission.isPending}>{decommission.isPending ? 'Decommissioning...' : 'Decommission'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={dialog.type === 'archive'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Equipment</DialogTitle>
            <DialogDescription>The item will be hidden from the default inventory view. It can be restored later.</DialogDescription>
          </DialogHeader>
          <Form {...archiveForm}>
            <form onSubmit={archiveForm.handleSubmit(async (values) => {
              try {
                await archiveEquipment.mutateAsync({ id: equipmentId, reason: values.reason || undefined });
                close(); onSuccess(); toast({ title: 'Equipment archived' });
              } catch { toast({ title: 'Failed to archive', variant: 'destructive' }); }
            })} className="space-y-4">
              <FormField control={archiveForm.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                <Button type="submit" disabled={archiveEquipment.isPending}>{archiveEquipment.isPending ? 'Archiving...' : 'Archive'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reclassify Dialog */}
      <Dialog open={dialog.type === 'reclassify'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reclassify Acquisition Type</DialogTitle>
            <DialogDescription>Changing the acquisition type may also change the item&apos;s operational status.</DialogDescription>
          </DialogHeader>
          <Form {...reclassifyForm}>
            <form onSubmit={reclassifyForm.handleSubmit(async (values) => {
              try {
                await reclassify.mutateAsync({ id: equipmentId, acquisitionType: values.acquisitionType, reason: values.reason });
                close(); onSuccess(); toast({ title: 'Acquisition type reclassified' });
              } catch { toast({ title: 'Failed to reclassify', variant: 'destructive' }); }
            })} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Current type: <strong>{{ PURCHASED: 'Purchased', DONATED_DEMO: 'Donated (Demo)', DONATED_GIVEABLE: 'Donated (Giveable)' }[equipment.acquisitionType] ?? equipment.acquisitionType}</strong>
              </p>
              <FormField control={reclassifyForm.control} name="acquisitionType" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Acquisition Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {equipment.acquisitionType !== 'PURCHASED' && <SelectItem value="PURCHASED">Purchased</SelectItem>}
                      {equipment.acquisitionType !== 'DONATED_DEMO' && <SelectItem value="DONATED_DEMO">Donated (Demo)</SelectItem>}
                      {equipment.acquisitionType !== 'DONATED_GIVEABLE' && <SelectItem value="DONATED_GIVEABLE">Donated (Giveable)</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={reclassifyForm.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                <Button type="submit" disabled={reclassify.isPending}>{reclassify.isPending ? 'Reclassifying...' : 'Reclassify'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reserve Dialog */}
      <ReserveDialog
        open={dialog.type === 'reserve'}
        onClose={close}
        equipmentId={equipmentId}
        createReservation={createReservation}
        onSuccess={onSuccess}
      />

      {/* Issue Loan Dialog */}
      <IssueLoanDialog
        open={dialog.type === 'issue_loan'}
        onClose={close}
        equipmentId={equipmentId}
        createLoan={createLoan}
        onSuccess={onSuccess}
      />

      {/* Allocate Directly Dialog */}
      <AllocateDialog
        open={dialog.type === 'allocate'}
        onClose={close}
        equipmentId={equipmentId}
        createAllocation={createAllocation}
        onSuccess={onSuccess}
      />

      {/* Start Demo Visit Dialog */}
      <Dialog open={dialog.type === 'start_demo'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Demo Visit</DialogTitle></DialogHeader>
          <Form {...demoForm}>
            <form onSubmit={demoForm.handleSubmit(async (values) => {
              try {
                await startDemoVisit.mutateAsync({
                  equipmentId,
                  destination: values.destination || undefined,
                  expectedReturn: values.expectedReturn || undefined,
                  notes: values.notes || undefined,
                });
                close(); onSuccess(); toast({ title: 'Demo visit started' });
              } catch { toast({ title: 'Failed to start demo visit', variant: 'destructive' }); }
            })} className="space-y-4">
              <FormField control={demoForm.control} name="destination" render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Home visit — Oxford" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={demoForm.control} name="expectedReturn" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Return</FormLabel>
                  <FormControl><Input {...field} type="date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={demoForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                <Button type="submit" disabled={startDemoVisit.isPending}>{startDemoVisit.isPending ? 'Starting...' : 'Start Demo Visit'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Client-selection dialogs extracted for clean state management ---

function ReserveDialog({
  open, onClose, equipmentId, createReservation, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  createReservation: ReturnType<typeof useCreateReservation>;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [client, setClient] = useState<ClientSummary | null>(null);
  const form = useForm<z.infer<typeof reserveSchema>>({
    resolver: zodResolver(reserveSchema),
    defaultValues: { expiresAt: '', notes: '' },
  });

  function handleClose() {
    form.reset();
    setClient(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reserve Equipment</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(async (values) => {
            if (!client) return;
            try {
              await createReservation.mutateAsync({
                equipmentId,
                clientId: client.id,
                expiresAt: values.expiresAt || undefined,
                notes: values.notes || undefined,
              });
              handleClose(); onSuccess(); toast({ title: 'Equipment reserved' });
            } catch { toast({ title: 'Failed to reserve', variant: 'destructive' }); }
          })} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client *</label>
              <ClientTypeahead onSelect={setClient} selectedClient={client} />
            </div>
            <FormField control={form.control} name="expiresAt" render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date (optional)</FormLabel>
                <FormControl><Input {...field} type="date" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={!client || createReservation.isPending}>{createReservation.isPending ? 'Reserving...' : 'Reserve'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function IssueLoanDialog({
  open, onClose, equipmentId, createLoan, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  createLoan: ReturnType<typeof useCreateLoan>;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [client, setClient] = useState<ClientSummary | null>(null);
  const form = useForm<z.infer<typeof issueLoanSchema>>({
    resolver: zodResolver(issueLoanSchema),
    defaultValues: { expectedReturn: '', conditionAtLoan: '', notes: '' },
  });

  function handleClose() {
    form.reset();
    setClient(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Issue Loan</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(async (values) => {
            if (!client) return;
            try {
              await createLoan.mutateAsync({
                equipmentId,
                clientId: client.id,
                expectedReturn: values.expectedReturn || undefined,
                conditionAtLoan: values.conditionAtLoan || undefined,
                notes: values.notes || undefined,
              });
              handleClose(); onSuccess(); toast({ title: 'Loan created' });
            } catch { toast({ title: 'Failed to create loan', variant: 'destructive' }); }
          })} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client *</label>
              <ClientTypeahead onSelect={setClient} selectedClient={client} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="expectedReturn" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Return</FormLabel>
                  <FormControl><Input {...field} type="date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="conditionAtLoan" render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition at Loan</FormLabel>
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
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={!client || createLoan.isPending}>{createLoan.isPending ? 'Creating...' : 'Issue Loan'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AllocateDialog({
  open, onClose, equipmentId, createAllocation, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  createAllocation: ReturnType<typeof useCreateAllocation>;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [client, setClient] = useState<ClientSummary | null>(null);
  const form = useForm<z.infer<typeof allocateSchema>>({
    resolver: zodResolver(allocateSchema),
    defaultValues: { notes: '' },
  });

  function handleClose() {
    form.reset();
    setClient(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate Directly</DialogTitle>
          <DialogDescription>This permanently assigns the equipment to a client. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(async (values) => {
            if (!client) return;
            try {
              await createAllocation.mutateAsync({
                equipmentId,
                clientId: client.id,
                notes: values.notes || undefined,
              });
              handleClose(); onSuccess(); toast({ title: 'Equipment allocated' });
            } catch { toast({ title: 'Failed to allocate', variant: 'destructive' }); }
          })} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client *</label>
              <ClientTypeahead onSelect={setClient} selectedClient={client} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={!client || createAllocation.isPending}>{createAllocation.isPending ? 'Allocating...' : 'Allocate Permanently'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
