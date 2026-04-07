'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useLabelTemplate } from '@/hooks/use-label-template';
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

  return (
    <>
      <LabelPrintToolbar
        printLabel={`Print ${cells.length} label${cells.length === 1 ? '' : 's'}`}
        printDisabled={loading}
      />

      <div className="no-print mb-6">
        <h1 className="text-xl font-semibold">
          Print Labels ({cells.length} item{cells.length === 1 ? '' : 's'})
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading
            ? 'Loading item details…'
            : 'Choose a sheet template and start position, then print.'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="no-print space-y-6">
          <TemplatePicker value={templateId} onChange={setTemplateId} />
          <StartPositionPicker
            template={template}
            value={safeStart}
            onChange={setStartPosition}
          />

          <LabelPrintInstructions template={template} />
        </div>

        <div>
          <LabelPrintView
            template={template}
            cells={cells}
            startPosition={safeStart}
          />
        </div>
      </div>
    </>
  );
}

