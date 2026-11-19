import type { ModelReasoningCapability, ModelReasoningSelection } from '@genispace/shared-types';
import { MODEL_REASONING_EFFORTS } from '@genispace/shared-types';
import { useTranslation } from 'react-i18next';
import { useId } from 'react';

type Props = {
  capability?: ModelReasoningCapability;
  value?: unknown;
  inherited?: boolean;
  disabled?: boolean;
  onChange: (value?: ModelReasoningSelection) => void;
};

export function ModelReasoningField({ capability, value, inherited, disabled, onChange }: Props) {
  const id = useId();
  const { t } = useTranslation('common');
  if (!capability?.modes.length && value === undefined) return null;

  const choices: Array<{ id: string; label: string; value?: ModelReasoningSelection }> = [
    { id: 'inherit', label: inherited ? t('modelReasoning.inherit', 'Inherit platform settings') : t('modelReasoning.default', 'Model default') },
  ];
  if (inherited) choices.push({ id: 'default', label: t('modelReasoning.default', 'Model default'), value: { mode: 'default' } });
  if (capability?.modes.includes('on')) {
    choices.push({ id: 'on', label: t('modelReasoning.on', 'On'), value: { mode: 'on' } });
    const effortLabels = {
      low: t('modelReasoning.low', 'Low'),
      high: t('modelReasoning.high', 'High'),
      max: t('modelReasoning.max', 'Maximum'),
    };
    for (const effort of MODEL_REASONING_EFFORTS) {
      if (capability.efforts.includes(effort)) {
        choices.push({ id: effort, label: effortLabels[effort], value: { mode: 'on', effort } });
      }
    }
  }
  if (capability?.modes.includes('off')) choices.push({ id: 'off', label: t('modelReasoning.off', 'Off'), value: { mode: 'off' } });

  const selection = value as Partial<{ mode: string; effort: string }> | undefined;
  const selected = selection?.mode === 'on' ? selection.effort ?? 'on' : selection?.mode ?? 'inherit';
  const valid = choices.some((choice) => choice.id === selected);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {t('modelReasoning.label', 'Model reasoning')}
      </label>
      <select
        id={id}
        className="input w-full"
        disabled={disabled}
        value={valid ? selected : 'unavailable'}
        onChange={(event) => onChange(choices.find((choice) => choice.id === event.target.value)?.value)}
      >
        {!valid && <option value="unavailable" disabled>{t('modelReasoning.unavailable', 'Previous selection is unavailable')}</option>}
        {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
      </select>
    </div>
  );
}
