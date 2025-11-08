/**
 * cache-service.ts
 * ----------------------
 * Service for providing caching functionality.
 */

import type { BunFile } from "bun";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mkdir,
  rm,
  exists,
  readFile,
  writeFile,
  readdir,
  stat,
} from "node:fs/promises";

/**
 * Cache backend
 */
export interface CacheBackend {
  /**
   * Get a cached value by key
   * @param key - cache key
   * @returns cached value or null if not found/expired
   */
  getValue<T>(key: string): Promise<T | null>;

  /**
   * Set a cached value by key with expiry
   * @param key - cache key
   * @param value - value to cache
   * @param expiresIn - expiry time in milliseconds
   */
  setValue<T>(key: string, value: T, expiresIn: number): Promise<void>;
}

/**
 * Interface representing a generic cache service.
 *
 * Provides methods to get and set cached values, as well as a utility to process and cache asynchronous fetch operations.
 *
 * @template T The type of the cached value.
 */
export interface CacheService {
  /**
   * Retrieves a cached value by key.
   * @param key - The cache key.
   * @returns The cached value of type T, or null if not found or expired.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stores a value in the cache with an expiry time.
   * @param key - The cache key.
   * @param value - The value to cache.
   * @param expiresIn - Expiry time in milliseconds.
   */
  set<T>(key: string, value: T, expiresIn: number): Promise<void>;

  /**
   * Processes an asynchronous fetch operation, caches the result, and returns the value.
   * If the value is already cached and valid, returns the cached value instead.
   * @param key - The cache key.
   * @param fetcher - A function that returns a Promise resolving to the value to cache.
   * @param expiresIn - Expiry time in milliseconds.
   * @returns A Promise resolving to the cached or fetched value of type T.
   */
  process<T>(
    key: string,
    fetcher: () => Promise<T>,
    expiresIn: number
  ): Promise<T>;
}

export class DefaultCacheService implements CacheService {
  constructor(private readonly backend: CacheBackend) {}

  async get<T>(key: string): Promise<T | null> {
    return this.backend.getValue<T>(key);
  }

  async set<T>(key: string, value: T, expiresIn: number): Promise<void> {
    return this.backend.setValue<T>(key, value, expiresIn);
  }

  async process<T>(
    key: string,
    fetcher: () => Promise<T>,
    expiresIn: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await fetcher();
    await this.set<T>(key, value, expiresIn);
    return value;
  }
}

export class MemoryCacheBackend implements CacheBackend {
  private cache = new Map<string, { value: any | null; timestamp: number }>();

  private cleanCache() {
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < cutoff) {
        this.cache.delete(key);
      }
    }
  }

  async getValue<T>(key: string): Promise<T | null> {
    this.cleanCache();
    const entry = this.cache.get(key);
    if (entry) {
      return entry.value as T;
    }
    return null;
  }

  async setValue<T>(key: string, value: T, expiresIn: number): Promise<void> {
    this.cleanCache();
    this.cache.set(key, { value, timestamp: Date.now() + expiresIn });
  }
}

export class FileCacheBackend implements CacheBackend {
  private readonly dir: string;

  private ready: Promise<void>;

  private fastCache = new Map<
    string,
    { value: any | null; timestamp: number }
  >();

  constructor(private readonly defaultExpiresIn: number, dir?: string) {
    if (!dir) {
      this.dir = join(tmpdir(), "brd-cache");
    } else {
      this.dir = dir;
    }

    this.ready = this.setup();
  }

  private async setup() {
    await mkdir(this.dir, { recursive: true });

    for (const file of await readdir(this.dir)) {
      if (!file.endsWith(".tmp")) continue;

      const filePath = join(this.dir, file);
      const data = await stat(filePath);
      if (data.mtimeMs + this.defaultExpiresIn <= Date.now()) {
        await rm(filePath);
      }
    }
  }

  private async check() {
    await this.ready;

    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;
    for (const [key, entry] of this.fastCache.entries()) {
      if (entry.timestamp < cutoff) {
        this.fastCache.delete(key);
        await rm(join(this.dir, key + ".tmp"));
      }
    }
  }

  async getValue<T>(key: string): Promise<T | null> {
    this.check();
    const entry = this.fastCache.get(key);
    if (entry) {
      return entry.value as T;
    }

    const filePath = join(this.dir, key + ".tmp");
    const exist = await exists(filePath);
    if (exist) {
      const data = await readFile(filePath, "utf-8");
      const value = JSON.parse(data) as T;
      this.fastCache.set(key, {
        value,
        timestamp: Date.now() + this.defaultExpiresIn,
      });
      return value;
    }

    return null;
  }

  async setValue<T>(key: string, value: T, expiresIn: number): Promise<void> {
    this.check();

    const filePath = join(this.dir, key + ".tmp");
    await writeFile(filePath, JSON.stringify(value), "utf-8");
    this.fastCache.set(key, { value, timestamp: Date.now() + expiresIn });
  }
}
