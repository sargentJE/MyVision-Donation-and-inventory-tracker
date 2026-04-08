'use client';

import { cn } from '@/lib/utils';
import {
  ALL_TEMPLATES,
  type LabelTemplateId,
} from '@/lib/label-templates';

interface TemplatePickerProps {
  value: LabelTemplateId;
  onChange: (id: LabelTemplateId) => void;
}

/**
 * Segmented control for selecting a label sheet template (Avery L7160,
 * QConnect 14, etc.). Renders one button per entry in the registry.
 *
 * Uses `role="radiogroup"` + `role="radio"` so screen readers announce it
 * as a single-select group rather than a row of unrelated buttons.
 */
export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Label sheet template</legend>
      <div
        role="radiogroup"
        aria-label="Label sheet template"
        className="flex flex-col gap-2 sm:flex-row"
      >
        {ALL_TEMPLATES.map((t) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(t.id)}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  // Inset shadow draws a 3px yellow strip on the left edge
                  // (mirrors the sidebar active-item accent) without
                  // disturbing the rounded primary border around it.
                  ? 'border-primary bg-primary/5 text-primary shadow-[inset_3px_0_0_0_#fdea18]'
                  : 'border-border hover:bg-muted/40',
              )}
            >
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">
                {t.cols} × {t.rows} · {t.labelWidthMm}×{t.labelHeightMm}mm
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
