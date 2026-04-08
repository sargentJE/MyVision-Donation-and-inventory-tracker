'use client';

import { useState, useDeferredValue } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEquipmentList } from '@/hooks/use-equipment';
import { useInventorySelection } from '@/hooks/use-inventory-selection';
import { buildBatchPrintHref } from '@/lib/label-batch';
import { EquipmentTable } from '@/components/equipment/equipment-table';
import { InventorySelectionBar } from '@/components/equipment/inventory-selection-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';

const STATUSES = [
  { value: 'AVAILABLE_FOR_LOAN', label: 'Available for Loan' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'ON_LOAN', label: 'On Loan' },
  { value: 'ALLOCATED_OUT', label: 'Allocated Out' },
  { value: 'AVAILABLE_FOR_DEMO', label: 'Available for Demo' },
  { value: 'ON_DEMO_VISIT', label: 'On Demo Visit' },
  { value: 'DECOMMISSIONED', label: 'Decommissioned' },
];

const CATEGORIES = [
  { value: 'DIGITAL_MAGNIFIER', label: 'Digital Magnifier' },
  { value: 'CCTV_MAGNIFIER', label: 'CCTV Magnifier' },
  { value: 'TEXT_TO_SPEECH', label: 'Text to Speech' },
  { value: 'SMARTPHONE', label: 'Smartphone' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'MONITOR', label: 'Monitor' },
  { value: 'OTHER', label: 'Other' },
];

export default function InventoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const { selection, toggle, clear, toggleAllOnPage } = useInventorySelection();

  const allStockQuery = useEquipmentList({
    page,
    pageSize: 25,
    q: deferredSearch || undefined,
    status: statusFilter ? [statusFilter] : undefined,
    deviceCategory: categoryFilter ? [categoryFilter] : undefined,
    isArchived: showArchived || undefined,
  });

  const forSaleQuery = useEquipmentList({
    page: 1,
    pageSize: 25,
    isForSale: true,
  });

  function printSelected() {
    if (selection.size === 0) return;
    router.push(buildBatchPrintHref([...selection]));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <Button asChild>
          <Link href="/equipment/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="all-stock">
        <TabsList>
          <TabsTrigger value="all-stock">All Stock</TabsTrigger>
          <TabsTrigger value="for-sale">
            For Sale
            {forSaleQuery.data?.meta.total
              ? ` (${forSaleQuery.data.meta.total})`
              : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-stock" className="space-y-4">
          <fieldset className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <legend className="sr-only">Filter equipment</legend>
            <div className="relative flex-1">
              <Label htmlFor="equipment-search" className="sr-only">
                Search equipment
              </Label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="equipment-search"
                placeholder="Search name, make, model, serial..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div>
              <Label htmlFor="status-filter" className="sr-only">
                Filter by status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v === 'ALL' ? '' : v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status-filter" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category-filter" className="sr-only">
                Filter by category
              </Label>
              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  setCategoryFilter(v === 'ALL' ? '' : v);
                  setPage(1);
                }}
              >
                <SelectTrigger id="category-filter" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-archived"
                checked={showArchived}
                onCheckedChange={(v) => {
                  setShowArchived(v === true);
                  setPage(1);
                }}
              />
              <Label htmlFor="show-archived" className="text-sm">
                Show archived
              </Label>
            </div>
          </fieldset>

          <EquipmentTable
            data={allStockQuery.data?.data}
            meta={allStockQuery.data?.meta}
            isLoading={allStockQuery.isLoading}
            onPageChange={setPage}
            selection={selection}
            onToggle={toggle}
            onToggleAllOnPage={toggleAllOnPage}
          />
        </TabsContent>

        <TabsContent value="for-sale" className="space-y-4">
          {forSaleQuery.data?.data.length === 0 && !forSaleQuery.isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              No items currently flagged for sale. Flag a purchased item from
              its detail page.
            </div>
          ) : (
            <EquipmentTable
              data={forSaleQuery.data?.data}
              meta={forSaleQuery.data?.meta}
              isLoading={forSaleQuery.isLoading}
              onPageChange={() => {}}
              selection={selection}
              onToggle={toggle}
              onToggleAllOnPage={toggleAllOnPage}
            />
          )}
        </TabsContent>
      </Tabs>

      <InventorySelectionBar
        count={selection.size}
        onPrint={printSelected}
        onClear={clear}
      />
    </div>
  );
}
