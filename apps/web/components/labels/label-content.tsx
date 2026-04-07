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
  const qrMm = Math.min(heightMm * 0.6, widthMm * 0.4);
  const nameFontPt = heightMm >= 50 ? 10 : 8;
  const metaFontPt = heightMm >= 50 ? 9 : 7;
  const idFontPt = heightMm >= 50 ? 7 : 6;

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
      <div style={{ height: '6mm', marginBottom: '1mm' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/myvision-logo.svg"
          alt="MyVision Oxfordshire"
          style={{ height: '5mm' }}
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
