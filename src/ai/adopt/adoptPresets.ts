import { localizedText } from './parseAiSummary';
import type { AdoptFieldConfig } from '../types';

export function genericSummaryField(label: string, targetField: string): AdoptFieldConfig {
  return {
    label,
    summaryPath: 'summary',
    targetField,
    toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
  };
}

export function narrationAdoptField(label: string): AdoptFieldConfig {
  return {
    label,
    summaryPath: 'narration',
    targetField: 'narration',
    toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
  };
}

export function recommendationAdoptField(label: string, targetField = 'ref'): AdoptFieldConfig {
  return {
    label,
    summaryPath: 'recommendation',
    targetField,
    toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
  };
}

export function synopsisAdoptField(label: string, targetField = 'synopsis'): AdoptFieldConfig {
  return {
    label,
    summaryPath: 'synopsis',
    targetField,
    toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
  };
}

export function noteAdoptField(label: string, targetField = 'note'): AdoptFieldConfig {
  return {
    label,
    summaryPath: 'note',
    targetField,
    toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
  };
}

export function internalNotesAdoptField(label: string): AdoptFieldConfig {
  return {
    label,
    summaryPath: 'internal_notes',
    targetField: 'internal_notes',
    toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
  };
}

export function jobTitleAdoptField(label: string): AdoptFieldConfig {
  return {
    label,
    summaryPath: 'job_title',
    targetField: 'job_title',
    toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
  };
}

export function descriptionAdoptField(label: string, targetField = 'description'): AdoptFieldConfig {
  return {
    label,
    summaryPath: 'description',
    targetField,
    toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
  };
}

export function appendTextAdoptField(
  label: string,
  summaryPath: string,
  targetField: string,
  currentValue: string | null | undefined,
): AdoptFieldConfig {
  return {
    label,
    summaryPath,
    targetField,
    toValue: (raw, _parsed, language) => {
      const suggestion = localizedText(raw, language ?? 'en').trim();
      const existing = currentValue?.trim() ?? '';
      if (!suggestion || existing === suggestion || existing.includes(suggestion)) {
        return existing || suggestion;
      }
      return existing ? `${existing}\n\n${suggestion}` : suggestion;
    },
  };
}
