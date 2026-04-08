'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer } from 'lucide-react';
import { useEquipment } from '@/hooks/use-equipment';
import { useLabelTemplate } from '@/hooks/use-label-template';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LabelPrintView } from '@/components/labels/label-print-view';
import { LabelPrintToolbar } from '@/components/labels/label-print-toolbar';
import { LabelPrintInstructions } from '@/components/labels/label-print-instructions';
import { TemplatePicker } from '@/components/labels/template-picker';
import { StartPositionPicker } from '@/components/labels/start-position-picker';
import { QuantityStepper } from '@/components/labels/quantity-stepper';
import type { LabelCell } from '@/components/labels/label-sheet';

export default function LabelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useEquipment(params.id);
  const { templateId, template, setTemplateId } = useLabelTemplate();
  const [startPosition, setStartPosition] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Switching templates resets start position to 0 — a position that was
  // valid on the old template (e.g. cell 18 on L7160) silently clamps on
  // the new template (max cell 13 on QConnect 14), leaving the picker
  // visually desynced from the underlying state if we don't reset.
  useEffect(() => {
    setStartPosition(0);
  }, [templateId]);

  const equipment = data?.data;

  const maxQty = template.labelsPerSheet * 10;
  const safeStart = Math.min(startPosition, template.labelsPerSheet - 1);
  const safeQty = Math.max(1, Math.min(quantity, maxQty));

  const qrUrl = useMemo(() => {
    if (!equipment) return '';
    return typeof window !== 'undefined'
      ? `${window.location.origin}/equipment/${equipment.id}`
      : `/equipment/${equipment.id}`;
  }, [equipment]);

  const cells: LabelCell[] = useMemo(() => {
    if (!equipment) return [];
    return Array.from({ length: safeQty }, () => ({
      equipment: {
        id: equipment.id,
        name: equipment.name,
        make: equipment.make,
        model: equipment.model,
        serialNumber: equipment.serialNumber,
      },
      qrUrl,
    }));
  }, [equipment, qrUrl, safeQty]);

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
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const printLabel = `Print ${safeQty} label${safeQty === 1 ? '' : 's'}`;

  return (
    <>
      <LabelPrintToolbar backLabel="Back to Item" />

      <div className="no-print mb-6 space-y-2">
        <h1 className="text-xl font-semibold">
          Print Label: {equipment.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {template.name} · {template.labelWidthMm}×{template.labelHeightMm}mm
            · {template.labelsPerSheet}/sheet
          </Badge>
          <p className="text-sm text-muted-foreground">
            Configure and preview before printing.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="no-print space-y-4">
          {/* Card 1 — Template */}
          <section
            aria-labelledby="template-heading"
            className="rounded-md border p-6 space-y-4"
          >
            <h2 id="template-heading" className="text-lg font-medium">
              Template
            </h2>
            <TemplatePicker value={templateId} onChange={setTemplateId} />
          </section>

          {/* Card 2 — Quantity */}
          <section
            aria-labelledby="quantity-heading"
            className="rounded-md border p-6 space-y-4"
          >
            <h2 id="quantity-heading" className="text-lg font-medium">
              Quantity
            </h2>
            <QuantityStepper
              value={safeQty}
              min={1}
              max={maxQty}
              onChange={setQuantity}
              fillLabel="Fill sheet"
              onFill={() =>
                setQuantity(template.labelsPerSheet - safeStart)
              }
              label="Labels to print"
            />
          </section>

          {/* Card 3 — Advanced (collapsible, defaults closed) */}
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
        >
          <Printer className="mr-2 h-4 w-4" />
          {printLabel}
        </Button>
        <LabelPrintInstructions template={template} />
      </div>
    </>
  );
}
