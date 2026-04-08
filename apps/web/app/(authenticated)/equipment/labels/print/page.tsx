'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useLabelTemplate } from '@/hooks/use-label-template';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LabelPrintView } from '@/components/labels/label-print-view';
import { LabelPrintToolbar } from '@/components/labels/label-print-toolbar';
import { LabelPrintInstructions } from '@/components/labels/label-print-instructions';
import { TemplatePicker } from '@/components/labels/template-picker';
import { StartPositionPicker } from '@/components/labels/start-position-picker';
import type { LabelCell } from '@/components/labels/label-sheet';
import { resolveBatchIds } from '@/lib/label-batch';

// TODO(batch-endpoint): v1 uses N client-side /equipment/:id calls via useQueries
// for selections up to ~50 items. If real-world usage shows slowness on larger
// batches, add GET /equipment?ids=a,b,c to the API and switch to a single fetch.
// See /Users/jamiesargent/.claude/plans/toasty-snacking-elephant.md (Part 2 API).

interface EquipmentLite {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
}

export default function BatchLabelPrintPage() {
  return (
    <Suspense fallback={null}>
      <BatchLabelPrintInner />
    </Suspense>
  );
}

function BatchLabelPrintInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { templateId, template, setTemplateId } = useLabelTemplate();
  const [startPosition, setStartPosition] = useState(0);
  const [ids, setIds] = useState<string[]>([]);

  // Reset start position when template changes (see single-item page).
  useEffect(() => {
    setStartPosition(0);
  }, [templateId]);

  useEffect(() => {
    setIds(resolveBatchIds(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.equipment.detail(id),
      queryFn: () => api.get<{ data: EquipmentLite }>(`/equipment/${id}`),
      enabled: !!id,
      staleTime: 60_000,
    })),
  });

  const loading = queries.some((q) => q.isLoading);
  const equipmentList = useMemo(
    () =>
      queries
        .map((q) => q.data?.data)
        .filter((e): e is EquipmentLite => !!e),
    [queries],
  );

  const safeStart = Math.min(startPosition, template.labelsPerSheet - 1);

  const cells: LabelCell[] = useMemo(() => {
    return equipmentList.map((equipment) => ({
      equipment,
      qrUrl:
        typeof window !== 'undefined'
          ? `${window.location.origin}/equipment/${equipment.id}`
          : `/equipment/${equipment.id}`,
    }));
  }, [equipmentList]);

  if (ids.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <h1 className="text-xl font-semibold">No items selected</h1>
        <p className="text-sm text-muted-foreground">
          Select one or more items from the inventory list, then choose
          &quot;Print labels&quot;.
        </p>
        <Button variant="outline" onClick={() => router.push('/equipment')}>
          Back to inventory
        </Button>
      </div>
    );
  }

  const printLabel = `Print ${cells.length} label${cells.length === 1 ? '' : 's'}`;

  return (
    <>
      <LabelPrintToolbar />

      <div className="no-print mb-6 space-y-2">
        <h1 className="text-xl font-semibold">
          Print Labels{' '}
          <span className="text-muted-foreground font-normal text-base">
            ({cells.length} item{cells.length === 1 ? '' : 's'})
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {template.name} · {template.labelWidthMm}×{template.labelHeightMm}mm
            · {template.labelsPerSheet}/sheet
          </Badge>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Loading item details…'
              : 'Configure and preview before printing.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="no-print space-y-4">
          {/* Card 1 — Template */}
          <section
            aria-labelledby="batch-template-heading"
            className="rounded-md border p-6 space-y-4"
          >
            <h2 id="batch-template-heading" className="text-lg font-medium">
              Template
            </h2>
            <TemplatePicker value={templateId} onChange={setTemplateId} />
          </section>

          {/* Card 2 — Advanced (collapsible, defaults closed) */}
          <details className="rounded-md border p-4 group">
            <summary className="cursor-pointer select-none text-sm font-medium text-foreground/80 hover:text-foreground">
              Use a partially-used sheet
              <span className="text-muted-foreground font-normal ml-2">
                (advanced — currently starts at cell {safeStart + 1})
              </span>
            </summary>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Skip the first N cells if your sticker sheet is partially
                used. Empty cells appear with a dashed outline in the preview.
              </p>
              <StartPositionPicker
                template={template}
                value={safeStart}
                onChange={setStartPosition}
              />
            </div>
          </details>
        </div>

        <LabelPrintView
          template={template}
          cells={cells}
          startPosition={safeStart}
          printLabel={printLabel}
          printDisabled={loading}
        />
      </div>

      {/* Sticky mobile action bar — Print + (?) instructions trigger.
          Clears the BottomNav (h-16, bottom-0). The (?) trigger ensures
          mobile users have the same access to print-dialog instructions
          as desktop users (where the trigger lives in LabelPrimaryActions). */}
      <div className="lg:hidden fixed inset-x-4 bottom-24 z-30 no-print flex items-center gap-2">
        <Button
          size="lg"
          className="flex-1 shadow-lg"
          onClick={() => window.print()}
          disabled={loading}
        >
          <Printer className="mr-2 h-4 w-4" />
          {printLabel}
        </Button>
        <LabelPrintInstructions template={template} />
      </div>
    </>
  );
}
