'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_TEMPLATE_ID,
  isLabelTemplateId,
  LABEL_TEMPLATES,
  type LabelTemplate,
  type LabelTemplateId,
} from '@/lib/label-templates';

const STORAGE_KEY = 'myvision:labelTemplateId';

/**
 * Selected label template, persisted in localStorage.
 *
 * SSR-safe: first server render and first client render both return the
 * registry default. After mount, the stored value (if valid) is applied.
 */
export function useLabelTemplate() {
  const [templateId, setTemplateIdState] =
    useState<LabelTemplateId>(DEFAULT_TEMPLATE_ID);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isLabelTemplateId(stored)) {
        setTemplateIdState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setTemplateId = useCallback((next: LabelTemplateId) => {
    setTemplateIdState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const template: LabelTemplate = LABEL_TEMPLATES[templateId];

  return { templateId, template, setTemplateId };
}
