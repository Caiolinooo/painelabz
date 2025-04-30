/**
 * Advanced caching utilities for the application
 */

// Type for cache entry with expiration
interface CacheEntry<T> {
  value: T;
  expiry: number | null; // Timestamp when the entry expires, null for no expiration
}

// In-memory cache store
const memoryCache: Map<string, CacheEntry<any>> = new Map();

// Default TTL in seconds
const DEFAULT_TTL = 3600; // 1 hour

// Maximum cache size (number of entries)
const MAX_CACHE_SIZE = Number(process.env.NEXT_MEMORY_CACHE_SIZE) || 500;

/**
 * Get a value from the cache
 * @param key Cache key
 * @returns The cached value or undefined if not found or expired
 */
export function getCacheValue<T>(key: string): T | undefined {
  const entry = memoryCache.get(key);
  
  if (!entry) return undefined;
  
  // Check if entry has expired
  if (entry.expiry !== null && Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return undefined;
  }
  
  return entry.value as T;
}

/**
 * Set a value in the cache
 * @param key Cache key
 * @param value Value to cache
 * @param ttlSeconds Time to live in seconds, null for no expiration
 */
export function setCacheValue<T>(key: string, value: T, ttlSeconds: number | null = DEFAULT_TTL): void {
  // Enforce cache size limit with LRU eviction
  if (memoryCache.size >= MAX_CACHE_SIZE) {
    // Get the oldest entry (first inserted)
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  }
  
  const expiry = ttlSeconds === null ? null : Date.now() + (ttlSeconds * 1000);
  
  memoryCache.set(key, { value, expiry });
}

/**
 * Remove a value from the cache
 * @param key Cache key
 * @returns true if the entry was found and removed, false otherwise
 */
export function removeCacheValue(key: string): boolean {
  return memoryCache.delete(key);
}

/**
 * Clear all entries from the cache
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * Get cache statistics
 * @returns Object with cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys())
  };
}

/**
 * Memoize a function with caching
 * @param fn Function to memoize
 * @param keyFn Function to generate a cache key from the arguments
 * @param ttlSeconds Time to live in seconds, null for no expiration
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args),
  ttlSeconds: number | null = DEFAULT_TTL
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    const key = `memo:${keyFn(...args)}`;
    const cached = getCacheValue<ReturnType<T>>(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const result = fn(...args);
    
    // Handle promises
    if (result instanceof Promise) {
      return result.then(value => {
        setCacheValue(key, value, ttlSeconds);
        return value;
      }) as ReturnType<T>;
    }
    
    setCacheValue(key, result, ttlSeconds);
    return result;
  };
}

/**
 * Create a cached version of a function that returns a promise
 * @param fn Async function to cache
 * @param keyFn Function to generate a cache key from the arguments
 * @param ttlSeconds Time to live in seconds, null for no expiration
 * @returns Cached async function
 */
export function cacheAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args),
  ttlSeconds: number | null = DEFAULT_TTL
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = `async:${keyFn(...args)}`;
    const cached = getCacheValue<Awaited<ReturnType<T>>>(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const result = await fn(...args);
    setCacheValue(key, result, ttlSeconds);
    return result;
  };
}

/**
 * Prefetch and cache a value
 * @param key Cache key
 * @param fetchFn Function that returns the value to cache
 * @param ttlSeconds Time to live in seconds, null for no expiration
 * @returns Promise that resolves to the fetched value
 */
export async function prefetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number | null = DEFAULT_TTL
): Promise<T> {
  const result = await fetchFn();
  setCacheValue(key, result, ttlSeconds);
  return result;
}

// Initialize cache cleanup interval
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_MEMORY_CACHE === 'true') {
  // Run cleanup every 5 minutes
  setInterval(() => {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, entry] of memoryCache.entries()) {
      if (entry.expiry !== null && now > entry.expiry) {
        memoryCache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
