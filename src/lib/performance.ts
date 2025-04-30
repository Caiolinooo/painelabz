/**
 * Utility functions for performance monitoring and optimization
 */

// Store performance marks
const marks: Record<string, number> = {};

/**
 * Start timing a specific operation
 * @param name Unique identifier for the operation
 */
export function startMeasure(name: string): void {
  if (typeof performance !== 'undefined') {
    marks[name] = performance.now();
  }
}

/**
 * End timing a specific operation and return the duration
 * @param name Unique identifier for the operation (must match a previous startMeasure call)
 * @returns Duration in milliseconds, or -1 if the mark wasn't found
 */
export function endMeasure(name: string): number {
  if (typeof performance !== 'undefined' && marks[name]) {
    const duration = performance.now() - marks[name];
    delete marks[name]; // Clean up
    return duration;
  }
  return -1;
}

/**
 * Log a performance measurement with optional context
 * @param name Name of the operation
 * @param duration Duration in milliseconds
 * @param context Additional context information
 */
export function logPerformance(name: string, duration: number, context?: Record<string, any>): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`⏱️ Performance [${name}]: ${duration.toFixed(2)}ms`, context || '');
  }
}

/**
 * Measure and log the execution time of a function
 * @param name Name of the operation
 * @param fn Function to measure
 * @param context Additional context information
 * @returns The result of the function
 */
export async function measureAsync<T>(
  name: string, 
  fn: () => Promise<T>, 
  context?: Record<string, any>
): Promise<T> {
  startMeasure(name);
  try {
    const result = await fn();
    const duration = endMeasure(name);
    logPerformance(name, duration, context);
    return result;
  } catch (error) {
    const duration = endMeasure(name);
    logPerformance(`${name} (error)`, duration, { error, ...context });
    throw error;
  }
}

/**
 * Measure and log the execution time of a synchronous function
 * @param name Name of the operation
 * @param fn Function to measure
 * @param context Additional context information
 * @returns The result of the function
 */
export function measure<T>(
  name: string, 
  fn: () => T, 
  context?: Record<string, any>
): T {
  startMeasure(name);
  try {
    const result = fn();
    const duration = endMeasure(name);
    logPerformance(name, duration, context);
    return result;
  } catch (error) {
    const duration = endMeasure(name);
    logPerformance(`${name} (error)`, duration, { error, ...context });
    throw error;
  }
}

/**
 * Create a higher-order function that measures performance
 * @param name Name of the operation
 * @param fn Function to measure
 * @returns A wrapped function that measures performance
 */
export function withPerformance<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    return measure(name, () => fn(...args), { args });
  };
}

/**
 * Create a higher-order function that measures async performance
 * @param name Name of the operation
 * @param fn Async function to measure
 * @returns A wrapped function that measures performance
 */
export function withAsyncPerformance<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return await measureAsync(name, () => fn(...args), { args });
  };
}

/**
 * Get current memory usage if available
 * @returns Memory usage in MB or null if not available
 */
export function getMemoryUsage(): number | null {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
  }
  return null;
}

/**
 * Debounce a function to improve performance
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>): void => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function to improve performance
 * @param fn Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>): void => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}
