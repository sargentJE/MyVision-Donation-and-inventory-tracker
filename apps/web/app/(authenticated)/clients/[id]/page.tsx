'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClient, useAnonymiseClient } from '@/hooks/use-clients';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
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
import { EyeOff } from 'lucide-react';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, refetch } = useClient(params.id);
  const anonymise = useAnonymiseClient();

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

  const client = data?.data;
  if (!client) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Client Not Found</h1>
        <Button variant="outline" onClick={() => router.push('/clients')}>Back to Clients</Button>
      </div>
    );
  }

  async function handleAnonymise() {
    try {
      await anonymise.mutateAsync(params.id);
      refetch();
      toast({ title: 'Client anonymised' });
    } catch {
      toast({ title: 'Failed to anonymise', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{client.displayName}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">{client.charitylogId}</span>
            {client.isAnonymised && <Badge variant="secondary">Anonymised</Badge>}
          </div>
        </div>
        {isAdmin && !client.isAnonymised && (
          <Button variant="destructive" size="sm" onClick={handleAnonymise} disabled={anonymise.isPending}>
            <EyeOff className="mr-2 h-4 w-4" />
            {anonymise.isPending ? 'Anonymising...' : 'Anonymise'}
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Loan History</h2>
        {client.loans.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table aria-label="Loan history">
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Loaned</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <Link
                        href={`/equipment/${loan.equipmentId}`}
                        className="text-primary hover:underline"
                      >
                        {loan.equipmentName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(loan.loanedAt)}</TableCell>
                    <TableCell>{formatDate(loan.returnedAt)}</TableCell>
                    <TableCell>
                      {!loan.returnedAt ? (
                        <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                      ) : loan.closedReason === 'RETURNED' ? (
                        <Badge variant="secondary">Returned</Badge>
                      ) : (
                        <Badge variant="secondary">{loan.closedReason}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No loan history.</p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Allocations</h2>
        {client.allocations.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table aria-label="Allocation history">
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.allocations.map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell>
                      <Link
                        href={`/equipment/${alloc.equipmentId}`}
                        className="text-primary hover:underline"
                      >
                        {alloc.equipmentName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(alloc.allocatedAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {alloc.originatingLoanId ? (
                        <Link href={`/loans/${alloc.originatingLoanId}`} className="text-primary hover:underline">
                          From loan
                        </Link>
                      ) : (
                        'Direct'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No allocations.</p>
        )}
      </div>
    </div>
  );
}
