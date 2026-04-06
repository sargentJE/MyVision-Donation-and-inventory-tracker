'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useEquipment } from '@/hooks/use-equipment';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Printer } from 'lucide-react';

// Avery L7160 dimensions (mm)
const LABEL_W = 63.5;
const LABEL_H = 38.1;
const TOP_MARGIN = 15.1;
const LEFT_MARGIN = 7.2;
const COL_GAP = 2.5;
const ROWS = 7;
const COLS = 3;
const TOTAL_POSITIONS = ROWS * COLS;

function getPosition(index: number) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  return {
    top: TOP_MARGIN + row * LABEL_H,
    left: LEFT_MARGIN + col * (LABEL_W + COL_GAP),
  };
}

export default function LabelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useEquipment(params.id);
  const [selectedPosition, setSelectedPosition] = useState(0);

  const equipment = data?.data;

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
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/equipment/${equipment.id}`
    : `/equipment/${equipment.id}`;

  const pos = getPosition(selectedPosition);

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="no-print space-y-6 p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Item
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Label
          </Button>
        </div>

        <div>
          <h1 className="text-xl font-semibold">Print Label: {equipment.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a position on the Avery L7160 sheet, then click Print.
          </p>
        </div>

        {/* Label preview */}
        <div className="rounded-md border p-4 bg-white">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Label Preview</h2>
          <div
            className="border-2 border-dashed border-muted-foreground/30 mx-auto relative overflow-hidden"
            style={{ width: `${LABEL_W}mm`, height: `${LABEL_H}mm` }}
          >
            <LabelContent equipment={equipment} qrUrl={qrUrl} />
          </div>
        </div>

        {/* Position picker */}
        <div>
          <fieldset>
          <legend className="text-sm font-medium text-muted-foreground mb-3">
            Sheet Position ({selectedPosition + 1} of {TOTAL_POSITIONS})
          </legend>
          <div
            className="border rounded-md bg-white mx-auto p-2"
            style={{ width: '220px' }}
          >
            <div className="grid grid-cols-3 gap-px">
              {Array.from({ length: TOTAL_POSITIONS }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedPosition(i)}
                  className={cn(
                    'aspect-[63.5/38.1] rounded-sm border text-[10px] font-mono transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    i === selectedPosition
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-muted-foreground border-muted hover:bg-muted/60',
                  )}
                  aria-label={`Label position ${i + 1}`}
                  aria-pressed={i === selectedPosition}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          </fieldset>
        </div>

        {/* Instructions */}
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm space-y-1">
          <p className="font-medium text-amber-900">Printing Instructions</p>
          <ol className="list-decimal list-inside text-amber-800 space-y-0.5">
            <li>Load an Avery L7160 sticker sheet into your printer</li>
            <li>Click "Print Label" above</li>
            <li>In the print dialog: set <strong>Scale to 100%</strong> and <strong>Margins to None</strong></li>
            <li>Print</li>
          </ol>
        </div>
      </div>

      {/* Print-only: positioned label on A4 */}
      <div
        className="print-only"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '210mm',
          height: '297mm',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: `${pos.top}mm`,
            left: `${pos.left}mm`,
            width: `${LABEL_W}mm`,
            height: `${LABEL_H}mm`,
            overflow: 'hidden',
          }}
        >
          <LabelContent equipment={equipment} qrUrl={qrUrl} />
        </div>
      </div>

      {/* Print styles defined in styles/globals.css */}
    </>
  );
}

function LabelContent({
  equipment,
  qrUrl,
}: {
  equipment: {
    id: string;
    name: string;
    make: string | null;
    model: string | null;
    serialNumber: string | null;
  };
  qrUrl: string;
}) {
  const makeModel = [equipment.make, equipment.model].filter(Boolean).join(' ');
  const shortId = equipment.id.substring(0, 8);

  return (
    <div
      style={{
        width: '63.5mm',
        height: '38.1mm',
        padding: '2mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '7pt',
        lineHeight: 1.3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      {/* Logo */}
      <div style={{ height: '6mm', marginBottom: '1mm' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/myvision-logo.svg"
          alt="MyVision Oxfordshire"
          style={{ height: '5mm' }}
        />
      </div>

      {/* Content row: text left, QR right */}
      <div style={{ display: 'flex', flex: 1, gap: '2mm' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontWeight: 'bold', fontSize: '8pt', marginBottom: '0.5mm' }}>
            {equipment.name}
          </div>
          {makeModel && (
            <div style={{ color: '#555' }}>{makeModel}</div>
          )}
          {equipment.serialNumber && (
            <div style={{ color: '#555' }}>S/N: {equipment.serialNumber}</div>
          )}
          <div style={{ color: '#888', marginTop: '1mm', fontSize: '6pt' }}>
            ID: {shortId}
          </div>
        </div>

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <QRCodeSVG
            value={qrUrl}
            size={80}
            level="M"
            style={{ width: '22mm', height: '22mm' }}
          />
        </div>
      </div>
    </div>
  );
}
