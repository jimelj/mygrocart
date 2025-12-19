/**
 * Logger Utility - Environment-aware logging
 *
 * Provides structured logging with different levels (debug, info, warn, error)
 * Production mode: Only logs warnings and errors
 * Development mode: Logs everything
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(context = '') {
    this.context = context;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Get current log level threshold based on environment
   * Production: Only WARN and ERROR
   * Development: Everything (DEBUG and above)
   */
  getLogLevel() {
    return this.isProduction ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
  }

  /**
   * Format log message with context and timestamp
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    return `${timestamp} ${level} ${contextStr} ${message}`;
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message, ...args) {
    if (LOG_LEVELS.DEBUG >= this.getLogLevel()) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  /**
   * Log info messages (only in development)
   */
  info(message, ...args) {
    if (LOG_LEVELS.INFO >= this.getLogLevel()) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }

  /**
   * Log warning messages (production and development)
   */
  warn(message, ...args) {
    if (LOG_LEVELS.WARN >= this.getLogLevel()) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  /**
   * Log error messages (production and development)
   */
  error(message, ...args) {
    if (LOG_LEVELS.ERROR >= this.getLogLevel()) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }
}

/**
 * Create a logger instance with optional context
 * @param {string} context - Context for logging (e.g., "TargetScraper")
 * @returns {Logger} - Logger instance
 */
function createLogger(context = '') {
  return new Logger(context);
}

module.exports = {
  Logger,
  createLogger
};
