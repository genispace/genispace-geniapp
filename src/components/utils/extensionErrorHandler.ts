export const isExtensionError = (error: Error | string): boolean => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? '' : (error.stack || '');

  const extensionErrorPatterns = [
    /disconnected port object/i,
    /extension context invalidated/i,
    /message port closed/i,
    /could not establish connection/i,
    /receiving end does not exist/i,
    /chrome-extension:/i,
    /moz-extension:/i,
    /safari-extension:/i,
    /proxy\.js/i, 
    /attempting to use a disconnected port/i,
    /handleMessageFromPage/i, 
  ];

  return extensionErrorPatterns.some(pattern => 
    pattern.test(errorMessage) || 
    pattern.test(errorStack)
  );
};

export const handleExtensionError = (error: Error): void => {
  if (isExtensionError(error)) {

    console.warn('[ExtensionErrorHandler] Browser extension error detected (silently handled):', {
      message: error.message,
      stack: error.stack?.split('\n')[0], 
      timestamp: new Date().toISOString(),
      advice: 'This error is caused by a browser extension and does not affect your application.'
    });
    return;
  }

  throw error;
};

export const setupExtensionErrorHandler = (): void => {

  window.addEventListener('error', (event) => {

    const errorMessage = event.message || '';
    const errorStack = event.error?.stack || '';

    if (event.error && isExtensionError(event.error)) {
      handleExtensionError(event.error);
      event.preventDefault(); 
      event.stopPropagation(); 
      return false;
    }

    if (isExtensionError(errorMessage) || isExtensionError(errorStack)) {
      console.warn('[ExtensionErrorHandler] Browser extension error detected in error event:', {
        message: errorMessage,
        stack: errorStack.split('\n')[0],
        timestamp: new Date().toISOString(),
      });
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true); 

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof Error && isExtensionError(event.reason)) {
      handleExtensionError(event.reason);
      event.preventDefault(); 
      return false;
    }

    if (typeof event.reason === 'string' && isExtensionError(event.reason)) {
      console.warn('[ExtensionErrorHandler] Browser extension error detected in unhandledrejection:', {
        reason: event.reason,
        timestamp: new Date().toISOString(),
      });
      event.preventDefault();
      return false;
    }
  });

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorMessage = args.join(' ');

    if (typeof errorMessage === 'string' && isExtensionError(errorMessage)) {

      return;
    }

    if (args[0] instanceof Error && isExtensionError(args[0])) {
      return;
    }

    originalConsoleError.apply(console, args);
  };
};

export const diagnoseExtensionIssues = (): void => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[ExtensionErrorHandler] Checking for problematic browser extensions...');

    const suspiciousPatterns = [
      /chrome-extension:/,
      /moz-extension:/,
      /safari-extension:/,
    ];

    const scripts = Array.from(document.scripts);
    const suspiciousScripts = scripts.filter(script => 
      suspiciousPatterns.some(pattern => pattern.test(script.src))
    );

    if (suspiciousScripts.length > 0) {
      console.warn('[ExtensionErrorHandler] Found browser extension scripts that may cause port errors:',
        suspiciousScripts.map(s => s.src)
      );
    }

    const extensionGlobals = ['chrome', 'browser', 'moz', 'safari'].filter(
      name => (window as any)[name] && (window as any)[name].runtime
    );

    if (extensionGlobals.length > 0) {
      console.warn('[ExtensionErrorHandler] Detected extension APIs:', extensionGlobals);
    }
  }
}; 