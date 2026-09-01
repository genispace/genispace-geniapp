import { useCallback, useEffect, useRef, useState } from 'react';
import { GENISPACE_SHELL_INIT_APPLIED_EVENT } from '../shell/shell';

export type ManagedPickerOption = {
  id: string;
  label: string;
  [key: string]: unknown;
};

export type ManagedPickerConfig = {
  providerGeniappId: string;
  datasourceIdentifier: string;
  buildApiRoot: () => string;
  readToken: () => string | null;
  probePicker: (apiRoot: string, token: string | null) => Promise<boolean>;
  loadOptions: (apiRoot: string, token: string | null, ensureIds?: string[]) => Promise<ManagedPickerOption[]>;
};

export function createUseManagedAppPicker(config: ManagedPickerConfig) {
  return function useManagedGeniappPicker(enabled: boolean, ensureIds: string[] = []) {
    const ensureKey = ensureIds.filter(Boolean).sort().join('\0');
    const [pickerAvailable, setPickerAvailable] = useState(false);
    const [options, setOptions] = useState<ManagedPickerOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const reloadGeneration = useRef(0);

    const reload = useCallback(async () => {
      const generation = ++reloadGeneration.current;
      if (!enabled) {
        if (generation !== reloadGeneration.current) return;
        setPickerAvailable(false);
        setOptions([]);
        setLoadError(null);
        setLoading(false);
        return;
      }
      const apiRoot = config.buildApiRoot();
      const token = config.readToken();
      setLoading(true);
      setLoadError(null);
      try {
        const available = await config.probePicker(apiRoot, token);
        if (generation !== reloadGeneration.current) return;
        if (!available) {
          setPickerAvailable(false);
          setOptions([]);
          return;
        }
        try {
          const opts = await config.loadOptions(apiRoot, token, ensureIds.filter(Boolean));
          if (generation !== reloadGeneration.current) return;
          setPickerAvailable(true);
          setOptions(opts);
        } catch (e) {
          if (generation !== reloadGeneration.current) return;
          setLoadError(e instanceof Error ? e.message : String(e));
          setPickerAvailable(false);
          setOptions([]);
        }
      } catch (e) {
        if (generation !== reloadGeneration.current) return;
        setLoadError(e instanceof Error ? e.message : String(e));
        setPickerAvailable(false);
        setOptions([]);
      } finally {
        if (generation === reloadGeneration.current) {
          setLoading(false);
        }
      }
    }, [enabled, ensureKey]);

    useEffect(() => {
      void reload();
    }, [reload]);

    useEffect(() => {
      const onApplied = () => {
        void reload();
      };
      window.addEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onApplied);
      return () => window.removeEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onApplied);
    }, [reload]);

    return { pickerAvailable, options, loading, loadError, reload, providerGeniappId: config.providerGeniappId };
  };
}
