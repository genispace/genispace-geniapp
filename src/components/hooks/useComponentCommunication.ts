import { useCallback, useEffect, useRef } from 'react';
import { ParameterValue, ParameterChangeEvent } from '../types/parameters';
import { useParameterContext } from '../contexts/ParameterContext';

export interface ComponentCommunicationConfig {
  componentId: string;

  emitParameters?: string[];

  listenParameters?: string[];

  onParameterChange?: (key: string, value: ParameterValue, event: ParameterChangeEvent) => void;

  autoCleanup?: boolean;

  

  immediate?: boolean;
}

export interface ComponentCommunicationReturn {

  emit: (key: string, value: ParameterValue) => void;

  emitBatch: (params: Record<string, ParameterValue>) => void;

  getCurrentParameter: (key: string) => ParameterValue;

  getAllParameters: () => Record<string, ParameterValue>;

  subscribe: (keys: string[], callback: (event: ParameterChangeEvent) => void) => () => void;

  hasListeners: (key: string) => boolean;
}

export const useComponentCommunication = (
  config: ComponentCommunicationConfig
): ComponentCommunicationReturn => {
  const parameterContext = useParameterContext();
  const { componentId, emitParameters, listenParameters, onParameterChange, autoCleanup = true, immediate = false } = config;

  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  const emit = useCallback((key: string, value: ParameterValue) => {

    if (emitParameters && !emitParameters.includes(key)) {
      console.warn(`[ComponentCommunication] Component ${componentId} tried to emit parameter '${key}' which is not in the allowed emit list`);
      return;
    }

    parameterContext.broadcastParameterChange(key, value, 'component', componentId);
  }, [parameterContext, componentId, emitParameters]);

  const emitBatch = useCallback((params: Record<string, ParameterValue>) => {
    Object.entries(params).forEach(([key, value]) => {
      emit(key, value);
    });
  }, [emit]);

  const getCurrentParameter = useCallback((key: string): ParameterValue => {

    const currentParams = parameterContext.getCurrentTabParams();
    return currentParams[key];
  }, [parameterContext]);

  const getAllParameters = useCallback(() => {
    return { ...parameterContext.getCurrentTabParams() };
  }, [parameterContext]);

  const subscribe = useCallback((keys: string[], callback: (event: ParameterChangeEvent) => void) => {
    const unsubscribe = parameterContext.subscribeToParameter({
      parameterKeys: keys,
      callback,
      componentId: `${componentId}-manual`,
      immediate: false
    });

    if (autoCleanup) {
      cleanupFunctionsRef.current.push(unsubscribe);
    }

    return unsubscribe;
  }, [parameterContext, componentId, autoCleanup]);

  const hasListeners = useCallback((key: string): boolean => {

    return true;
  }, []);

  const listenParametersKey = JSON.stringify(listenParameters || []);

  useEffect(() => {
    if (!listenParameters?.length) {
      return;
    }

    const unsubscribe = parameterContext.subscribeToParameter({
      parameterKeys: listenParameters,
      callback: (event) => {
        if (onParameterChange) {

          setTimeout(() => {
            onParameterChange(event.key, event.value, event);
          }, 0);
        }
      },
      componentId,
      immediate
    });

    if (autoCleanup) {
      cleanupFunctionsRef.current.push(unsubscribe);
    }

    return unsubscribe;

  }, [listenParametersKey, componentId, autoCleanup, immediate]);

  useEffect(() => {
    return () => {
      if (autoCleanup) {
        cleanupFunctionsRef.current.forEach(cleanup => {
          try {
            cleanup();
          } catch (error) {
            console.error(`[ComponentCommunication] Error during cleanup for component ${componentId}:`, error);
          }
        });
        cleanupFunctionsRef.current = [];
      }
    };
  }, [componentId, autoCleanup]);

  return {
    emit,
    emitBatch,
    getCurrentParameter,
    getAllParameters,
    subscribe,
    hasListeners
  };
};

export const useParameterEmitter = (componentId: string, allowedParameters?: string[]) => {
  const { emit, emitBatch } = useComponentCommunication({
    componentId,
    emitParameters: allowedParameters,
    autoCleanup: true
  });

  return { emit, emitBatch };
};

export const useParameterListener = (
  componentId: string, 
  parameters: string[], 
  callback: (key: string, value: ParameterValue, event: ParameterChangeEvent) => void
) => {
  const { getCurrentParameter, getAllParameters } = useComponentCommunication({
    componentId,
    listenParameters: parameters,
    onParameterChange: callback,
    autoCleanup: true
  });

  return { getCurrentParameter, getAllParameters };
};

