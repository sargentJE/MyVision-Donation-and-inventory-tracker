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
  // Unchanged in this round — only the text+logo grow.
  const qrMm = Math.min(heightMm * 0.6, widthMm * 0.4);
  // Bumped from 8/7/6 → 10/8/7 in round-3 so the printed labels are
  // legible on a sticker sheet. Vertical fit verified: with the new 8mm
  // logo container (was 6mm), the content row is 25.1mm and the QR is
  // 22.86mm — 2.24mm of slack remains. The text block at the new sizes
  // (4 lines × ~0.46mm/pt × 1.3 line-height + 1mm marginTop) is ~15.5mm,
  // well within the 25mm available. The dormant ≥50mm path is left alone.
  const nameFontPt = heightMm >= 50 ? 10 : 10;
  const metaFontPt = heightMm >= 50 ? 9 : 8;
  const idFontPt = heightMm >= 50 ? 7 : 7;

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
        Logo container 8mm (was 6mm) and img 7mm (was 5mm) — round-3 tweak
        for legibility on printed sticker sheets. The 2mm growth here
        shrinks the content row from 27.1mm to 25.1mm; the QR (22.86mm)
        still fits with 2.24mm of slack.
      */}
      <div style={{ height: '8mm', marginBottom: '1mm' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/myvision-logo.svg"
          alt="MyVision Oxfordshire"
          style={{ height: '7mm' }}
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
