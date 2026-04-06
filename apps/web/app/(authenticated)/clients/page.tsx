'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClients, useAnonymiseClient } from '@/hooks/use-clients';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Users, MoreHorizontal, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { TableEmptyState } from '@/components/shared/table-empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [anonymiseTarget, setAnonymiseTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useClients({ page, pageSize: 25 });
  const anonymise = useAnonymiseClient();

  const clients = data?.data ?? [];
  const meta = data?.meta;

  async function handleAnonymise() {
    if (!anonymiseTarget) return;
    try {
      await anonymise.mutateAsync(anonymiseTarget.id);
      setAnonymiseTarget(null);
      toast({ title: 'Client anonymised' });
    } catch {
      toast({ title: 'Failed to anonymise', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Clients</h1>

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
            <Table aria-label="Client list">
              <TableHeader>
                <TableRow>
                  <TableHead>CharityLog ID</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && (
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-mono text-sm">{client.charitylogId}</TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {client.displayName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {client.isAnonymised ? (
                        <Badge variant="secondary">Anonymised</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {!client.isAnonymised && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions for {client.displayName}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  setAnonymiseTarget({ id: client.id, name: client.displayName })
                                }
                                className="text-destructive"
                              >
                                <EyeOff className="mr-2 h-4 w-4" />
                                Anonymise
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableEmptyState
                    colSpan={isAdmin ? 4 : 3}
                    icon={Users}
                    message="No clients found. Clients are created when issuing loans."
                  />
                )}
              </TableBody>
            </Table>
          </div>

          {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
        </>
      )}

      {/* Anonymise Confirmation — AlertDialog for destructive/irreversible action */}
      <AlertDialog open={!!anonymiseTarget} onOpenChange={(o) => !o && setAnonymiseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anonymise Client</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The client&apos;s display name will be replaced with
              &quot;Anonymised&quot;. Their CharityLog ID and associated records will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setAnonymiseTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleAnonymise} disabled={anonymise.isPending}>
              {anonymise.isPending ? 'Anonymising...' : 'Anonymise'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
