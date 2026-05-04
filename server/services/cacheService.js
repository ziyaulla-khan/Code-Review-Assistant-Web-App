/**
 * Cache Service
 * In-memory caching using node-cache for repeated review requests
 */
const NodeCache = require('node-cache');
const crypto = require('crypto');

// Create cache instance with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

/**
 * Generate cache key from code and language
 */
const REVIEW_CACHE_VERSION = 'v3';

const generateCacheKey = (code, language) => {
  const hash = crypto
    .createHash('md5')
    .update(`${REVIEW_CACHE_VERSION}:${language}:${code}`)
    .digest('hex');
  return `review:${hash}`;
};

/**
 * Get cached review result
 */
const getCachedReview = (code, language) => {
  const key = generateCacheKey(code, language);
  return cache.get(key);
};

/**
 * Store review result in cache
 */
const setCachedReview = (code, language, result) => {
  const key = generateCacheKey(code, language);
  return cache.set(key, result);
};

/**
 * Clear all cached reviews
 */
const clearCache = () => {
  return cache.flushAll();
};

/**
 * Get cache stats
 */
const getCacheStats = () => {
  return cache.getStats();
};

module.exports = {
  getCachedReview,
  setCachedReview,
  clearCache,
  getCacheStats,
};
