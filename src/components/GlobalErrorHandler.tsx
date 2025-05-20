'use client';

import { useEffect } from 'react';

export default function GlobalErrorHandler() {
  useEffect(() => {
    // Handle regular errors
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
      // Log additional information about the error
      if (event.error && event.error.stack) {
        console.error('Error stack:', event.error.stack);
      }
      console.error('Error occurred at:', event.filename, 'line:', event.lineno, 'column:', event.colno);

      // Prevent the error from breaking the entire app
      event.preventDefault();
    });

    // Handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      // Log additional information about the rejection
      if (event.reason && event.reason.stack) {
        console.error('Rejection stack:', event.reason.stack);
      }

      // Prevent the rejection from breaking the entire app
      event.preventDefault();
    });

    // Override console.error to add more context
    const originalConsoleError = console.error;
    console.error = function(...args) {
      // Add timestamp to error logs
      const timestamp = new Date().toISOString();
      originalConsoleError.apply(console, [`[${timestamp}]`, ...args]);

      // Check if this is a React error
      const errorString = args.join(' ');
      if (errorString.includes('React') || errorString.includes('Suspense') || errorString.includes('lazy')) {
        originalConsoleError.apply(console, ['This appears to be a React-related error. Check your component imports and Suspense boundaries.']);
      }
    };

    // Cleanup function
    return () => {
      window.removeEventListener('error', () => {});
      window.removeEventListener('unhandledrejection', () => {});
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
