/**
 * Retry Helper - Exponential backoff retry logic for scrapers
 *
 * Provides utility functions for retrying failed operations with exponential backoff
 */

const { createLogger } = require('./logger');
const logger = createLogger('RetryHelper');

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 2)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 10000)
 * @param {Function} options.shouldRetry - Optional function to determine if error should be retried
 * @param {string} options.operationName - Name of operation for logging (default: 'operation')
 * @returns {Promise<any>} - Result of the function
 * @throws {Error} - Last error if all retries fail
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 2,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
    operationName = 'operation'
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        logger.warn(`${operationName} failed with non-retryable error: ${error.message}`);
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        logger.error(`${operationName} failed after ${maxRetries + 1} attempts`);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      logger.warn(`${operationName} attempt ${attempt + 1} failed: ${error.message}`);
      logger.info(`Retrying in ${delay}ms...`);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 * Network errors, timeouts, and 5xx errors are retryable
 * 4xx client errors are not retryable
 * @param {Error} error - Error to check
 * @returns {boolean} - True if error is retryable
 */
function isRetryableError(error) {
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
    return true;
  }

  // HTTP timeout errors
  if (error.message && error.message.includes('timeout')) {
    return true;
  }

  // HTTP response errors
  if (error.response) {
    const status = error.response.status;
    // Retry on 5xx errors (server errors)
    if (status >= 500 && status < 600) {
      return true;
    }
    // Retry on 429 (Too Many Requests)
    if (status === 429) {
      return true;
    }
    // Retry on 408 (Request Timeout)
    if (status === 408) {
      return true;
    }
    // Don't retry on 4xx client errors (except 408 and 429)
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Default: retry on unknown errors
  return true;
}

/**
 * Retry a scraper operation
 * Convenience wrapper for retryWithBackoff with scraper-specific defaults
 * @param {Function} fn - Async scraper function to retry
 * @param {string} operationName - Name of operation for logging
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @returns {Promise<any>} - Result of the function
 */
async function retryScrapeOperation(fn, operationName, maxRetries = 2) {
  return retryWithBackoff(fn, {
    maxRetries,
    baseDelay: 2000, // 2 seconds
    maxDelay: 8000, // 8 seconds max
    shouldRetry: isRetryableError,
    operationName
  });
}

module.exports = {
  retryWithBackoff,
  retryScrapeOperation,
  isRetryableError,
  sleep
};
