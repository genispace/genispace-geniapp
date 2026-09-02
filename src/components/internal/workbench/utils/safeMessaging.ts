import { isExtensionError, handleExtensionError } from './extensionErrorHandler';

const isWindowMessageTarget = (target: Window | Worker | MessagePort | BroadcastChannel): target is Window =>
  target === window ||
  (typeof Window !== 'undefined' && target instanceof Window) ||
  ('window' in target && (target as Window).window === target);

export const safePostMessage = (
  target: Window | Worker | MessagePort | BroadcastChannel,
  message: any,
  targetOrigin?: string
): boolean => {
  try {
    if ('postMessage' in target) {
      if (isWindowMessageTarget(target) && targetOrigin) {
        target.postMessage(message, targetOrigin);
      } else {
        (target as any).postMessage(message);
      }
      return true;
    }
    return false;
  } catch (error) {
    if (error instanceof Error && isExtensionError(error)) {
      handleExtensionError(error);
      return false;
    }
    throw error;
  }
};

export const safeAddEventListener = (
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): boolean => {
  try {
    target.addEventListener(type, listener, options);
    return true;
  } catch (error) {
    if (error instanceof Error && isExtensionError(error)) {
      handleExtensionError(error);
      return false;
    }
    throw error;
  }
};

export const safeRemoveEventListener = (
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions
): boolean => {
  try {
    target.removeEventListener(type, listener, options);
    return true;
  } catch (error) {
    if (error instanceof Error && isExtensionError(error)) {
      handleExtensionError(error);
      return false;
    }
    throw error;
  }
};

export const safeDispatchEvent = (
  target: EventTarget,
  event: Event
): boolean => {
  try {
    return target.dispatchEvent(event);
  } catch (error) {
    if (error instanceof Error && isExtensionError(error)) {
      handleExtensionError(error);
      return false;
    }
    throw error;
  }
};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      if (error instanceof Error && isExtensionError(error)) {
        handleExtensionError(error);
        return null;
      }
      throw error;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error instanceof Error && isExtensionError(error)) {
        handleExtensionError(error);
        return false;
      }
      throw error;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      if (error instanceof Error && isExtensionError(error)) {
        handleExtensionError(error);
        return false;
      }
      throw error;
    }
  }
};

export const safeFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response | null> => {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof Error && isExtensionError(error)) {
      handleExtensionError(error);
      return null;
    }
    throw error;
  }
};

export const safeDOMOperation = <T>(
  operation: () => T,
  fallback?: T
): T | undefined => {
  try {
    return operation();
  } catch (error) {
    if (error instanceof Error && isExtensionError(error)) {
      handleExtensionError(error);
      return fallback;
    }
    throw error;
  }
};

export const checkExtensionConflicts = (): {
  hasConflicts: boolean;
  conflicts: string[];
  recommendations: string[];
} => {
  const conflicts: string[] = [];
  const recommendations: string[] = [];

  try {

    const scripts = Array.from(document.scripts);
    const extensionScripts = scripts.filter(script => 
      /chrome-extension:|moz-extension:|safari-extension:/.test(script.src)
    );

    if (extensionScripts.length > 0) {
      conflicts.push(`Found ${extensionScripts.length} extension scripts`);
      recommendations.push('Consider disabling unnecessary browser extensions');
    }

    const suspiciousGlobals = ['chrome', 'browser'].filter(
      name => (window as any)[name] && typeof (window as any)[name] === 'object'
    );

    if (suspiciousGlobals.length > 0) {
      conflicts.push(`Extension APIs detected: ${suspiciousGlobals.join(', ')}`);
    }

    const originalConsoleError = console.error;
    let extensionErrors = 0;

    console.error = (...args) => {
      const message = args.join(' ');
      if (/disconnected port object|extension context invalidated/i.test(message)) {
        extensionErrors++;
      }
      originalConsoleError.apply(console, args);
    };

    setTimeout(() => {
      console.error = originalConsoleError;
    }, 5000);

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      recommendations
    };

  } catch (error) {
    return {
      hasConflicts: false,
      conflicts: [],
      recommendations: ['Unable to check for extension conflicts']
    };
  }
};
