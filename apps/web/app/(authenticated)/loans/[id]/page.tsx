'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLoan } from '@/hooks/use-loans';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ConditionBadge } from '@/components/equipment/condition-badge';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useLoan(params.id);

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

  const loan = data?.data as Record<string, unknown> | undefined;
  if (!loan) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Loan Not Found</h1>
        <Button variant="outline" onClick={() => router.push('/loans')}>Back to Loans</Button>
      </div>
    );
  }

  const equipment = loan.equipment as { id: string; name: string } | undefined;
  const client = loan.client as { id: string; displayName: string; charitylogId: string } | undefined;
  const isActive = !loan.returnedAt && !loan.closedReason;
  const isOverdue = isActive && !!loan.expectedReturn && new Date(String(loan.expectedReturn)) < new Date();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          Loan: {equipment?.name ?? 'Equipment'}
        </h1>
        <div className="flex items-center gap-2">
          {isActive ? (
            <Badge className="bg-blue-100 text-blue-800">Active</Badge>
          ) : loan.closedReason === 'RETURNED' ? (
            <Badge variant="secondary">Returned</Badge>
          ) : loan.closedReason === 'CONVERTED_TO_ALLOCATION' ? (
            <Badge className="bg-purple-100 text-purple-800">Converted to Allocation</Badge>
          ) : (
            <Badge variant="secondary">{loan.closedReason as string}</Badge>
          )}
          {isOverdue && <Badge variant="destructive">Overdue</Badge>}
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {equipment && (
          <div>
            <dt className="text-xs text-muted-foreground">Equipment</dt>
            <dd className="mt-0.5">
              <Link href={`/equipment/${equipment.id}`} className="text-sm text-primary hover:underline">
                {equipment.name}
              </Link>
            </dd>
          </div>
        )}
        {client && (
          <div>
            <dt className="text-xs text-muted-foreground">Client</dt>
            <dd className="mt-0.5">
              <Link href={`/clients/${client.id}`} className="text-sm text-primary hover:underline">
                {client.displayName}
              </Link>
              <span className="text-xs text-muted-foreground ml-1">({client.charitylogId})</span>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted-foreground">Loaned</dt>
          <dd className="mt-0.5 text-sm">{formatDate(String(loan.loanedAt))}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Expected Return</dt>
          <dd className="mt-0.5 text-sm">{formatDate(loan.expectedReturn ? String(loan.expectedReturn) : null)}</dd>
        </div>
        {!!loan.returnedAt && (
          <div>
            <dt className="text-xs text-muted-foreground">Returned</dt>
            <dd className="mt-0.5 text-sm">{formatDate(String(loan.returnedAt))}</dd>
          </div>
        )}
        {!!loan.conditionAtLoan && (
          <div>
            <dt className="text-xs text-muted-foreground">Condition at Loan</dt>
            <dd className="mt-0.5"><ConditionBadge condition={String(loan.conditionAtLoan)} /></dd>
          </div>
        )}
        {!!loan.conditionAtReturn && (
          <div>
            <dt className="text-xs text-muted-foreground">Condition at Return</dt>
            <dd className="mt-0.5"><ConditionBadge condition={String(loan.conditionAtReturn)} /></dd>
          </div>
        )}
        {!!loan.notes && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Notes</dt>
            <dd className="mt-0.5 text-sm">{String(loan.notes)}</dd>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push('/loans')}>
          Back to Loans
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled
          title="Receipt generation coming soon"
        >
          Download Receipt
        </Button>
      </div>
    </div>
  );
}
