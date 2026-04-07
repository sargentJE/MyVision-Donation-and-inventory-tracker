'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEquipment } from '@/hooks/use-equipment';
import { useLabelTemplate } from '@/hooks/use-label-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelPrintView } from '@/components/labels/label-print-view';
import { LabelPrintToolbar } from '@/components/labels/label-print-toolbar';
import { LabelPrintInstructions } from '@/components/labels/label-print-instructions';
import { TemplatePicker } from '@/components/labels/template-picker';
import { StartPositionPicker } from '@/components/labels/start-position-picker';
import type { LabelCell } from '@/components/labels/label-sheet';

export default function LabelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useEquipment(params.id);
  const { templateId, template, setTemplateId } = useLabelTemplate();
  const [startPosition, setStartPosition] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Switching templates resets start position to 0 — otherwise a position
  // that was valid on the old template (e.g. cell 18 on L7160) silently
  // clamps on the new template (max cell 13 on QConnect 14), leaving the
  // picker visually desynced from the underlying state.
  useEffect(() => {
    setStartPosition(0);
  }, [templateId]);

  const equipment = data?.data;

  const safeStart = Math.min(startPosition, template.labelsPerSheet - 1);
  const safeQty = Math.max(1, Math.min(quantity, template.labelsPerSheet * 10));

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

  return (
    <>
      <LabelPrintToolbar printLabel="Print Label" backLabel="Back to Item" />

      <div className="no-print mb-6">
        <h1 className="text-xl font-semibold">
          Print Label: {equipment.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a sheet template, position, and quantity, then click Print.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="no-print space-y-6">
          <TemplatePicker value={templateId} onChange={setTemplateId} />

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                min={1}
                max={template.labelsPerSheet * 10}
                value={quantity}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  if (!Number.isFinite(raw)) {
                    setQuantity(1);
                    return;
                  }
                  const clamped = Math.max(
                    1,
                    Math.min(template.labelsPerSheet * 10, Math.floor(raw)),
                  );
                  setQuantity(clamped);
                }}
                className="w-28"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setQuantity(template.labelsPerSheet - safeStart)
                }
              >
                Fill sheet
              </Button>
              <span className="text-sm text-muted-foreground">
                (1 – {template.labelsPerSheet * 10})
              </span>
            </div>
          </div>

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
