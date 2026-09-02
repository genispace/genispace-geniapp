import { useState } from 'react';
import { UpdateDatabaseConfig } from '@/types';

export const useConditionMapper = (
  updateConditions: UpdateDatabaseConfig['updateConditions'],
  onChange: (conditions: UpdateDatabaseConfig['updateConditions']) => void
) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleAddCondition = (
    fieldName: string,
    initialConfig: Partial<UpdateDatabaseConfig['updateConditions'][string]> = {}
  ) => {
    if (!fieldName.trim() || updateConditions[fieldName]) {
      console.warn(`条件字段 ${fieldName} 已存在或名称无效`);
      return false;
    }

    const defaultConfig = {
      source: 'static' as const,
      value: '',
      operator: 'equals' as const,
      ...initialConfig
    };

    onChange({
      ...updateConditions,
      [fieldName]: defaultConfig
    });

    return true;
  };

  const handleRemoveCondition = (fieldName: string) => {
    const newConditions = { ...updateConditions };
    delete newConditions[fieldName];
    onChange(newConditions);
  };

  const handleConditionChange = (
    fieldName: string,
    key: string,
    value: string
  ) => {
    if (!updateConditions[fieldName]) {
      console.warn(`条件字段 ${fieldName} 不存在`);
      return;
    }

    onChange({
      ...updateConditions,
      [fieldName]: {
        ...updateConditions[fieldName],
        [key]: value
      }
    });
  };

  const handleFieldRename = (oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return false;

    if (updateConditions[newName]) {
      console.warn(`字段名 ${newName} 已存在`);
      return false;
    }

    const newConditions = { ...updateConditions };
    newConditions[newName] = { ...newConditions[oldName] };
    delete newConditions[oldName];
    onChange(newConditions);

    return true;
  };

  const getConditionStats = () => {
    const conditions = Object.values(updateConditions);
    return {
      total: conditions.length,
      hasStatic: conditions.some(c => c.source === 'static'),
      hasParameter: conditions.some(c => c.source === 'parameter'),
      hasColumn: conditions.some(c => c.source === 'column'),
      hasInputField: conditions.some(c => c.source === 'input_field')
    };
  };

  return {

    isCollapsed,
    setIsCollapsed,

    handleAddCondition,
    handleRemoveCondition,
    handleConditionChange,
    handleFieldRename,

    getConditionStats
  };
};
