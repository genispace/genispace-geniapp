import { useState, useEffect, useRef, useCallback } from 'react';
import { useParameterContext } from '@/contexts/ParameterContext';

interface UseWaitForParametersOptions {

  onReady?: () => void;
}

interface UseWaitForParametersReturn {

  ready: boolean;

  isReady: (parameterKeys: string[]) => boolean;
}

export const useWaitForParameters = (
  listenParameters: string[] | undefined,
  options: UseWaitForParametersOptions = {}
): UseWaitForParametersReturn => {
  const { onReady } = options;
  const parameterContext = useParameterContext();

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const hasTriggeredReadyRef = useRef(false);

  const [ready, setReady] = useState<boolean>(() => {

    if (!listenParameters || listenParameters.length === 0) {
      return true;
    }

    return parameterContext.isParametersReady(listenParameters);
  });

  const listenParametersKey = JSON.stringify(listenParameters || []);

  const parameterContextRef = useRef(parameterContext);
  parameterContextRef.current = parameterContext;

  useEffect(() => {
    const ctx = parameterContextRef.current;

    if (!listenParameters || listenParameters.length === 0) {
      setReady(true);
      if (!hasTriggeredReadyRef.current) {
        hasTriggeredReadyRef.current = true;
        onReadyRef.current?.();
      }
      return;
    }

    if (ctx.isParametersReady(listenParameters)) {
      setReady(true);
      if (!hasTriggeredReadyRef.current) {
        hasTriggeredReadyRef.current = true;
        onReadyRef.current?.();
      }
      return;
    }

    const unsubscribe = ctx.subscribeToParametersReady(
      listenParameters,
      () => {
        setReady(true);
        if (!hasTriggeredReadyRef.current) {
          hasTriggeredReadyRef.current = true;
          onReadyRef.current?.();
        }
      }
    );

    return unsubscribe;

  }, [listenParametersKey]); 

  useEffect(() => {
    hasTriggeredReadyRef.current = false;

  }, [listenParametersKey]);

  const isReady = useCallback((parameterKeys: string[]): boolean => {
    return parameterContextRef.current.isParametersReady(parameterKeys);
  }, []);

  return {
    ready,
    isReady
  };
};

export default useWaitForParameters;
