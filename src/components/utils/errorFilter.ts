// Filter out common browser extension errors that are harmless
const originalConsoleError = console.error;

console.error = (...args: any[]) => {
  const message = args.join(' ');

  // List of error patterns to filter out
  const ignoredPatterns = [
    'disconnected port object',
    'Extension context invalidated',
    'Could not establish connection',
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'The message port closed before a response was received',
    'Attempting to use a disconnected port object',
    'postMessage',
    'backendManager.js'
  ];

  // Check if the error message contains any ignored patterns
  const shouldIgnore = ignoredPatterns.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );

  if (!shouldIgnore) {
    originalConsoleError.apply(console, args);
  } else {
    // Log as a warning instead for debugging purposes
    console.warn('Filtered browser extension error:', message);
  }
};

// Also filter console.warn for extension-related warnings
const originalConsoleWarn = console.warn;

console.warn = (...args: any[]) => {
  const message = args.join(' ');

  const ignoredWarningPatterns = [
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://'
  ];

  const shouldIgnore = ignoredWarningPatterns.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );

  if (!shouldIgnore) {
    originalConsoleWarn.apply(console, args);
  }
};

// Handle window error events for browser extensions
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || event.message || '';

  const extensionErrorPatterns = [
    'disconnected port object',
    'Extension context invalidated',
    'postMessage',
    'backendManager.js',
    'proxy.js'
  ];

  const isExtensionError = extensionErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );

  if (isExtensionError) {
    event.preventDefault();
    console.warn('Browser extension error filtered:', errorMessage);
    return false;
  }
});

// Handle unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || String(event.reason) || '';

  const extensionErrorPatterns = [
    'disconnected port object',
    'Extension context invalidated',
    'postMessage',
    'backendManager.js',
    'proxy.js'
  ];

  const isExtensionError = extensionErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );

  if (isExtensionError) {
    event.preventDefault();
    console.warn('Browser extension promise rejection filtered:', errorMessage);
    return false;
  }
});

export {}; // Make this a module 