/**
 * Caching utility for frequently accessed data
 * Provides in-memory caching with TTL and size limits
 */

import logger from './logger';

class Cache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100; // Maximum number of entries
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes in milliseconds
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute
    this.storage = new Map();
    this.timers = new Map();
    
    // Start cleanup interval
    this.startCleanup();
    
    logger.info('Cache initialized', {
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL
    });
  }

  // Set a cache entry
  set(key, value, ttl = null) {
    const actualTTL = ttl || this.defaultTTL;
    const expiresAt = Date.now() + actualTTL;
    
    // Remove existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // Check if we need to evict entries
    if (this.storage.size >= this.maxSize && !this.storage.has(key)) {
      this.evictLRU();
    }
    
    // Store the entry
    this.storage.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now()
    });
    
    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, actualTTL);
    
    this.timers.set(key, timer);
    
    logger.debug('Cache set', { key, ttl: actualTTL });
  }

  // Get a cache entry
  get(key) {
    const entry = this.storage.get(key);
    
    if (!entry) {
      logger.debug('Cache miss', { key });
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      logger.debug('Cache expired', { key });
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    logger.debug('Cache hit', { 
      key, 
      accessCount: entry.accessCount,
      age: Date.now() - entry.createdAt
    });
    
    return entry.value;
  }

  // Check if key exists and is not expired
  has(key) {
    const entry = this.storage.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  // Delete a cache entry
  delete(key) {
    const entry = this.storage.get(key);
    if (entry) {
      this.storage.delete(key);
      
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      
      logger.debug('Cache deleted', { key });
      return true;
    }
    return false;
  }

  // Clear all cache entries
  clear() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    const size = this.storage.size;
    this.storage.clear();
    
    logger.info('Cache cleared', { entriesCleared: size });
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let totalAccessCount = 0;
    let expiredEntries = 0;
    
    this.storage.forEach(entry => {
      totalAccessCount += entry.accessCount;
      if (now > entry.expiresAt) {
        expiredEntries++;
      }
    });
    
    return {
      size: this.storage.size,
      maxSize: this.maxSize,
      totalAccessCount,
      expiredEntries,
      hitRate: totalAccessCount > 0 ? 
        (this.storage.size / totalAccessCount) * 100 : 0
    };
  }

  // Evict least recently used entry
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    this.storage.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.delete(oldestKey);
      logger.debug('Cache evicted LRU entry', { key: oldestKey });
    }
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    this.storage.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.delete(key));
    
    if (expiredKeys.length > 0) {
      logger.debug('Cache cleanup completed', { 
        expiredEntries: expiredKeys.length 
      });
    }
  }

  // Start automatic cleanup
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  // Get all keys (for debugging)
  keys() {
    return Array.from(this.storage.keys());
  }

  // Get cache entry metadata
  getMetadata(key) {
    const entry = this.storage.get(key);
    if (!entry) return null;
    
    return {
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
      isExpired: Date.now() > entry.expiresAt,
      age: Date.now() - entry.createdAt,
      ttl: entry.expiresAt - entry.createdAt
    };
  }
}

// Create singleton instance
const cache = new Cache();

// Specialized cache instances for different data types
const apiCache = new Cache({
  maxSize: 50,
  defaultTTL: 2 * 60 * 1000, // 2 minutes for API responses
  cleanupInterval: 30 * 1000 // 30 seconds
});

const userCache = new Cache({
  maxSize: 20,
  defaultTTL: 10 * 60 * 1000, // 10 minutes for user data
  cleanupInterval: 60 * 1000 // 1 minute
});

const configCache = new Cache({
  maxSize: 10,
  defaultTTL: 30 * 60 * 1000, // 30 minutes for configuration
  cleanupInterval: 5 * 60 * 1000 // 5 minutes
});

// Cache decorator for functions
export const withCache = (fn, cacheInstance = cache, keyGenerator = null) => {
  return async (...args) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    // Try to get from cache first
    const cached = cacheInstance.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    try {
      const result = await fn(...args);
      cacheInstance.set(key, result);
      return result;
    } catch (error) {
      logger.error('Cached function execution failed', { 
        function: fn.name, 
        args, 
        error: error.message 
      });
      throw error;
    }
  };
};

// Cache key generators
export const cacheKeyGenerators = {
  // For API endpoints
  api: (method, url, params = {}) => 
    `api:${method}:${url}:${JSON.stringify(params)}`,
  
  // For user-specific data
  user: (userId, resource) => 
    `user:${userId}:${resource}`,
  
  // For site-specific data
  site: (siteId, resource) => 
    `site:${siteId}:${resource}`,
  
  // For ticket-specific data
  ticket: (ticketId, resource) => 
    `ticket:${ticketId}:${resource}`,
  
  // For list data with filters
  list: (resource, filters = {}) => 
    `list:${resource}:${JSON.stringify(filters)}`
};

// Export instances and utilities
export { Cache };
export default cache;
export { apiCache, userCache, configCache };
