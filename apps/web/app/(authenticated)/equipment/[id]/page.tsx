'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  useEquipment,
  useEquipmentAuditLog,
  useRestoreEquipment,
  useFlagForSale,
  useUnflagForSale,
  type AuditEntry,
} from '@/hooks/use-equipment';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatDateTime } from '@/lib/date-utils';
import { StatusBadge } from '@/components/equipment/status-badge';
import { ConditionBadge } from '@/components/equipment/condition-badge';
import { AcquisitionBadge } from '@/components/equipment/acquisition-badge';
import { CurrentActivityPanel } from '@/components/equipment/current-activity-panel';
import {
  EquipmentDialogs,
  type DialogMode,
} from '@/components/equipment/dialogs/equipment-dialogs';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Archive,
  ArchiveRestore,
  Ban,
  ChevronDown,
  ChevronUp,
  Pencil,
  RefreshCw,
  Tag,
  XCircle,
  HandCoins,
  Calendar,
  PackageCheck,
  MapPin,
  Printer,
} from 'lucide-react';

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, refetch } = useEquipment(params.id);
  const equipment = data?.data;

  const [dialog, setDialog] = useState<DialogMode>({ type: 'closed' });
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditPage, setAuditPage] = useState(1);

  const restoreEquipment = useRestoreEquipment();
  const flagForSale = useFlagForSale();
  const unflagForSale = useUnflagForSale();

  const auditLog = useEquipmentAuditLog(params.id, auditPage);

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

  if (!equipment) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Equipment Not Found</h1>
        <Button variant="outline" onClick={() => router.push('/equipment')}>
          Back to Inventory
        </Button>
      </div>
    );
  }

  const isDecommissioned = equipment.status === 'DECOMMISSIONED';

  async function handleRestore() {
    try {
      await restoreEquipment.mutateAsync({ id: params.id });
      refetch();
      toast({ title: 'Equipment restored from archive' });
    } catch {
      toast({ title: 'Failed to restore', variant: 'destructive' });
    }
  }

  async function handleFlagForSale() {
    try {
      if (equipment!.isForSale) {
        await unflagForSale.mutateAsync(params.id);
        toast({ title: 'Removed from sale' });
      } else {
        await flagForSale.mutateAsync(params.id);
        toast({ title: 'Flagged for sale' });
      }
      refetch();
    } catch {
      toast({ title: 'Operation failed', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{equipment.name}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={equipment.status} />
            <AcquisitionBadge acquisitionType={equipment.acquisitionType} />
            {equipment.isForSale && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">For Sale</span>
            )}
            {equipment.isArchived && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Archived</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isDecommissioned && (
            <Button variant="outline" size="sm" onClick={() => setDialog({ type: 'edit' })}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/equipment/${equipment.id}/label`, '_blank')}
          >
            <Printer className="mr-2 h-4 w-4" />Print Label
          </Button>
        </div>
      </div>

      {/* Loan lifecycle actions */}
      {equipment.status === 'AVAILABLE_FOR_LOAN' && equipment.acquisitionType === 'DONATED_GIVEABLE' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setDialog({ type: 'issue_loan' })}><HandCoins className="mr-2 h-4 w-4" />Issue Loan</Button>
          <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'reserve' })}><Calendar className="mr-2 h-4 w-4" />Reserve</Button>
          <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'allocate' })}><PackageCheck className="mr-2 h-4 w-4" />Allocate Directly</Button>
        </div>
      )}

      {/* Demo visit action */}
      {equipment.status === 'AVAILABLE_FOR_DEMO' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setDialog({ type: 'start_demo' })}><MapPin className="mr-2 h-4 w-4" />Start Demo Visit</Button>
        </div>
      )}

      <Separator />

      {/* Metadata grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetaField label="Make" value={equipment.make} />
        <MetaField label="Model" value={equipment.model} />
        <MetaField label="Serial Number" value={equipment.serialNumber} />
        <MetaField label="Category" value={equipment.deviceCategory.replace(/_/g, ' ')} />
        <MetaField label="Condition" value={<ConditionBadge condition={equipment.condition} />} />
        <MetaField label="Acquired" value={formatDate(equipment.acquiredAt)} />
        {equipment.supplier && <MetaField label="Supplier" value={equipment.supplier} />}
        {equipment.purchasePrice && <MetaField label="Purchase Price" value={`£${equipment.purchasePrice}`} />}
        {equipment.warrantyExpiry && <MetaField label="Warranty Expiry" value={formatDate(equipment.warrantyExpiry)} />}
        {equipment.donation && (
          <>
            <MetaField label="Donor" value={equipment.donation.donorName} />
            {equipment.donation.donorOrg && <MetaField label="Donor Organisation" value={equipment.donation.donorOrg} />}
            <MetaField label="Date Donated" value={formatDate(equipment.donation.donatedAt)} />
          </>
        )}
        {equipment.conditionNotes && <div className="sm:col-span-2"><MetaField label="Condition Notes" value={equipment.conditionNotes} /></div>}
        {equipment.notes && <div className="sm:col-span-2"><MetaField label="Notes" value={equipment.notes} /></div>}
        {equipment.decommissionedAt && (
          <>
            <MetaField label="Decommissioned" value={formatDate(equipment.decommissionedAt)} />
            <MetaField label="Reason" value={equipment.decommissionReason} />
          </>
        )}
      </div>

      {/* Current activity */}
      <CurrentActivityPanel activity={equipment.currentActivity} equipmentId={equipment.id} onActionComplete={() => refetch()} />

      {/* Admin actions */}
      {isAdmin && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Admin Actions</h3>
            <div className="flex flex-wrap gap-2">
              {!isDecommissioned && <Button variant="destructive" size="sm" onClick={() => setDialog({ type: 'decommission' })}><Ban className="mr-2 h-4 w-4" />Decommission</Button>}
              {!equipment.isArchived ? (
                <Button variant="outline" size="sm" onClick={() => setDialog({ type: 'archive' })}><Archive className="mr-2 h-4 w-4" />Archive</Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleRestore}><ArchiveRestore className="mr-2 h-4 w-4" />Restore</Button>
              )}
              {!isDecommissioned && <Button variant="outline" size="sm" onClick={() => setDialog({ type: 'reclassify' })}><RefreshCw className="mr-2 h-4 w-4" />Reclassify</Button>}
              {equipment.acquisitionType === 'PURCHASED' && !isDecommissioned && (
                <Button variant="outline" size="sm" onClick={handleFlagForSale}>
                  {equipment.isForSale ? <><XCircle className="mr-2 h-4 w-4" />Remove from Sale</> : <><Tag className="mr-2 h-4 w-4" />Flag for Sale</>}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Audit log */}
      <Separator />
      <div>
        <button type="button" aria-expanded={auditOpen} aria-controls="audit-log-panel" onClick={() => setAuditOpen(!auditOpen)} className="flex w-full items-center justify-between py-2 text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
          Audit Log
          {auditOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {auditOpen && (
          <div id="audit-log-panel" className="mt-2 space-y-3">
            {auditLog.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table aria-label="Audit log for this equipment item">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead className="hidden sm:table-cell">Old</TableHead>
                        <TableHead className="hidden sm:table-cell">New</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>When</TableHead>
                        <TableHead className="hidden md:table-cell">Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditLog.data?.data ?? []).map((entry: AuditEntry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs">{entry.event.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-xs">{entry.field ?? '—'}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs">{entry.oldValue ?? '—'}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs">{entry.newValue ?? '—'}</TableCell>
                          <TableCell className="text-xs">{entry.changedBy.name}</TableCell>
                          <TableCell className="text-xs">{formatDateTime(entry.changedAt)}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs">{entry.note ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                      {(auditLog.data?.data ?? []).length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">No activity recorded yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {auditLog.data?.meta && <PaginationControls meta={auditLog.data.meta} onPageChange={setAuditPage} />}
              </>
            )}
          </div>
        )}
      </div>

      {/* All dialogs — extracted to separate component */}
      <EquipmentDialogs equipment={equipment} equipmentId={params.id} dialog={dialog} setDialog={setDialog} onSuccess={() => refetch()} />
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value ?? '—'}</dd>
    </div>
  );
}
