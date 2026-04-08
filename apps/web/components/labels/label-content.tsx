'use client';

import { QRCodeSVG } from 'qrcode.react';

export interface LabelEquipment {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
}

interface LabelContentProps {
  equipment: LabelEquipment;
  qrUrl: string;
  widthMm: number;
  heightMm: number;
}

/**
 * Renders the visual content of a single label at the given physical size.
 * Used on-screen (for preview) and in print output.
 *
 * Font and QR sizes scale with the label height so both the L7160 (38.1mm)
 * and the wider QConnect 14 (also 38.1mm) look reasonable, and a future
 * smaller/larger template stays legible without a rewrite.
 */
export function LabelContent({
  equipment,
  qrUrl,
  widthMm,
  heightMm,
}: LabelContentProps) {
  const makeModel = [equipment.make, equipment.model]
    .filter(Boolean)
    .join(' ');
  const shortId = equipment.id.substring(0, 8);

  // QR code: 60% of the label height, capped at the shorter dimension.
  // Unchanged across all sizing rounds — the user explicitly said the QR
  // is fine.
  const qrMm = Math.min(heightMm * 0.6, widthMm * 0.4);
  // Round-4: aggressive bump because round-3's 10/8/7 was still too
  // small to read on a printed sticker sheet. All current templates are
  // 38.1mm tall so the constants below target that geometry.
  //
  //   Logo container 9mm + 1mm marginBottom = 10mm
  //   Content row    = 38.1 − 4 (padding) − 10 = 24.1mm
  //   QR             = min(38.1 × 0.6, …) = 22.86mm  → 1.24mm slack ✓
  //   Text block     = (13 + 10 + 10 + 9) × 0.353 × 1.3 + 1mm marginTop
  //                  = ~20.3mm in 24.1mm available    → 3.8mm slack ✓
  //
  // Long names truncate via the existing ellipsis CSS — no regression.
  // The dormant `heightMm >= 50` ternary was removed because no current
  // template is ≥50mm tall and ternary code paths that never run rot.
  // Re-add the conditional if/when a larger template is introduced.
  const nameFontPt = 13;
  const metaFontPt = 10;
  const idFontPt = 9;

  return (
    <div
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: '2mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: `${metaFontPt}pt`,
        lineHeight: 1.3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        color: '#000',
        background: '#fff',
      }}
    >
      {/*
        Round-4 logo: container 9mm (was 8mm), img 8mm (was 7mm). The
        +1mm growth here shrinks the content row from 25.1mm to 24.1mm;
        the QR (22.86mm) still fits with 1.24mm of slack — well within
        ±0.5mm print tolerance.
      */}
      <div style={{ height: '9mm', marginBottom: '1mm' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/myvision-logo.svg"
          alt="MyVision Oxfordshire"
          style={{ height: '8mm' }}
        />
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '2mm', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div
            style={{
              fontWeight: 'bold',
              fontSize: `${nameFontPt}pt`,
              marginBottom: '0.5mm',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {equipment.name}
          </div>
          {makeModel && (
            <div
              style={{
                color: '#555',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {makeModel}
            </div>
          )}
          {equipment.serialNumber && (
            <div
              style={{
                color: '#555',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              S/N: {equipment.serialNumber}
            </div>
          )}
          <div
            style={{
              color: '#888',
              marginTop: '1mm',
              fontSize: `${idFontPt}pt`,
            }}
          >
            ID: {shortId}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <QRCodeSVG
            value={qrUrl}
            size={Math.round(qrMm * 3.78)} /* ~px for mm @ 96dpi */
            level="M"
            style={{ width: `${qrMm}mm`, height: `${qrMm}mm` }}
          />
        </div>
      </div>
    </div>
  );
}
