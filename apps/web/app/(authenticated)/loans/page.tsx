'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLoans, type LoanSummary } from '@/hooks/use-loans';
import { HandCoins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { TableEmptyState } from '@/components/shared/table-empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysElapsed(from: string): number {
  return Math.floor((Date.now() - new Date(from).getTime()) / 86400000);
}

export default function LoansPage() {
  const [activePage, setActivePage] = useState(1);
  const [overduePage, setOverduePage] = useState(1);

  const activeQuery = useLoans({ active: true, page: activePage, pageSize: 25 });
  const overdueQuery = useLoans({ overdue: true, page: overduePage, pageSize: 25 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Loans</h1>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active
            {activeQuery.data?.meta.total ? ` (${activeQuery.data.meta.total})` : ''}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            {overdueQuery.data?.meta.total ? ` (${overdueQuery.data.meta.total})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <LoanTable
            data={activeQuery.data?.data}
            meta={activeQuery.data?.meta}
            isLoading={activeQuery.isLoading}
            page={activePage}
            onPageChange={setActivePage}
          />
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <LoanTable
            data={overdueQuery.data?.data}
            meta={overdueQuery.data?.meta}
            isLoading={overdueQuery.isLoading}
            page={overduePage}
            onPageChange={setOverduePage}
            showOverdue
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoanTable({
  data,
  meta,
  isLoading,
  page,
  onPageChange,
  showOverdue,
}: {
  data?: LoanSummary[];
  meta?: { total: number; page: number; pageSize: number; totalPages: number };
  isLoading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  showOverdue?: boolean;
}) {
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

  const items = data ?? [];

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table aria-label={showOverdue ? 'Overdue loans' : 'Active loans'}>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead className="hidden sm:table-cell">Loaned</TableHead>
              <TableHead>Expected Return</TableHead>
              <TableHead className="hidden md:table-cell">Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((loan) => {
              const isOverdue = loan.expectedReturn && new Date(loan.expectedReturn) < new Date();
              return (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">
                    {loan.client.displayName}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({loan.client.charitylogId})
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/equipment/${loan.equipmentId}`}
                      className="text-primary hover:underline"
                    >
                      {loan.equipmentName ?? 'View item'}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDate(loan.loanedAt)}
                  </TableCell>
                  <TableCell>
                    {loan.expectedReturn ? (
                      <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                        {formatDate(loan.expectedReturn)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No date set</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {daysElapsed(loan.loanedAt)}d
                    {isOverdue && (
                      <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableEmptyState
                colSpan={5}
                icon={HandCoins}
                message={showOverdue ? 'No overdue loans.' : 'No active loans.'}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {meta && <PaginationControls meta={meta} onPageChange={onPageChange} />}
    </>
  );
}
