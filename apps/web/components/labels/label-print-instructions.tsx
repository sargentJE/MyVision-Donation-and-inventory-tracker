import type { LabelTemplate } from '@/lib/label-templates';

interface LabelPrintInstructionsProps {
  template: LabelTemplate;
}

/**
 * The amber instructions panel shown next to the live preview on both
 * label print pages. Tells the user which sticker sheet to load and the
 * critical print-dialog settings (Scale 100%, Margins None) without which
 * the labels will be misaligned.
 */
export function LabelPrintInstructions({
  template,
}: LabelPrintInstructionsProps) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm space-y-1">
      <p className="font-medium text-amber-900">Printing instructions</p>
      <ol className="list-decimal list-inside text-amber-800 space-y-0.5">
        <li>
          Load a {template.brand} {template.name} sheet.
        </li>
        <li>Click &quot;Print&quot; above.</li>
        <li>
          In the print dialog: set <strong>Scale 100%</strong> and{' '}
          <strong>Margins: None</strong>.
        </li>
      </ol>
    </div>
  );
}
