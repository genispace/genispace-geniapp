import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';
import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import { Loader2 } from 'lucide-react';

interface SelectEditorProps {
  value: string | number;
  onChange: (value: string | number) => void;
  onSave: () => void;
  datasourceId?: string;
  version?: number;
  valueField?: string;
  labelField?: string;
  autoFocus?: boolean;

  staticOptions?: { value: string; label: string }[];

  commitOnSelect?: boolean;
}

export const SelectEditor: React.FC<SelectEditorProps> = ({
  value,
  onChange,
  onSave,
  datasourceId,
  version,
  valueField = 'id',
  labelField = 'name',
  autoFocus = true,
  staticOptions,
  commitOnSelect = true,
}) => {
  const useStatic = staticOptions !== undefined;
  const [fetchedOptions, setFetchedOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const options = useStatic ? (staticOptions ?? []) : fetchedOptions;

  useEffect(() => {
    if (useStatic) {
      setLoading(false);
      return;
    }
    if (!datasourceId) {
      setFetchedOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const response = await apiClient.post(
          withDatasourceVersion(
            `/datasources/${datasourceId}/data`,
            resolveRuntimeDatasourceVersion(datasourceId, version)
          ),
          {
          limit: 1000,
          offset: 0,
        });
        const responseData = response.data as { data?: { data?: any[] } };
        const data = responseData?.data?.data || [];
        if (!cancelled) {
          setFetchedOptions(
            Array.isArray(data)
              ? data.map((item: any) => ({
                  value: String(item[valueField] ?? ''),
                  label: String(item[labelField] ?? ''),
                }))
              : []
          );
        }
      } catch (error) {
        console.error('Failed to load select options:', error);
        if (!cancelled) setFetchedOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [datasourceId, version, useStatic, valueField, labelField]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (commitOnSelect) {
      onSave();
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full">
      <Select value={String(value)} onValueChange={handleChange} {...(autoFocus ? { autoFocus: true } : {})}>
        <SelectTrigger className="h-8 w-full min-w-0 max-w-full text-xs [&>span]:min-w-0">
          {loading ? (
            <div className="flex min-w-0 items-center gap-1">
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              <span className="truncate">Loading...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select..." />
          )}
        </SelectTrigger>
        <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        </SelectContent>
      </Select>
    </div>
  );
};