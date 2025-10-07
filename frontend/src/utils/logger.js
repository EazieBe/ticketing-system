/**
 * Comprehensive logging utility for the frontend application
 * Provides structured logging with different levels and contexts
 */

class Logger {
  constructor() {
    this.logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    this.context = 'frontend';
  }

  setLogLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.logLevel = level;
    }
  }

  setContext(context) {
    this.context = context;
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      context: this.context,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    return logEntry;
  }

  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatMessage(level, message, data);
    
    // Console logging
    const consoleMethod = level === 'error' ? 'error' : 
                         level === 'warn' ? 'warn' : 
                         level === 'info' ? 'info' : 'log';
    
    if (data) {
      console[consoleMethod](`[${logEntry.timestamp}] ${logEntry.level} [${logEntry.context}]: ${message}`, data);
    } else {
      console[consoleMethod](`[${logEntry.timestamp}] ${logEntry.level} [${logEntry.context}]: ${message}`);
    }

    // Send to backend in production
    if (process.env.NODE_ENV === 'production' && (level === 'error' || level === 'warn')) {
      this.sendToBackend(logEntry);
    }
  }

  async sendToBackend(logEntry) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.error('Failed to send log to backend:', error);
    }
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  // Specialized logging methods
  apiCall(method, url, data = null) {
    this.debug(`API ${method.toUpperCase()} ${url}`, data);
  }

  apiResponse(method, url, status, data = null) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'debug';
    this.log(level, `API ${method.toUpperCase()} ${url} - ${status}`, data);
  }

  userAction(action, details = null) {
    this.info(`User action: ${action}`, details);
  }

  performance(operation, duration, details = null) {
    this.info(`Performance: ${operation} took ${duration}ms`, details);
  }

  websocket(event, data = null) {
    this.debug(`WebSocket ${event}`, data);
  }

  componentLifecycle(component, lifecycle, props = null) {
    this.debug(`Component ${component} ${lifecycle}`, props);
  }

  stateChange(component, stateKey, oldValue, newValue) {
    this.debug(`State change in ${component}: ${stateKey}`, { oldValue, newValue });
  }

  navigation(from, to) {
    this.info(`Navigation: ${from} -> ${to}`);
  }

  errorBoundary(error, errorInfo) {
    this.error('Error boundary caught error', { 
      error: error.toString(), 
      stack: error.stack,
      componentStack: errorInfo.componentStack 
    });
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and the class
export { Logger };
export default logger;

// Convenience exports for common logging patterns
export const logApiCall = (method, url, data) => logger.apiCall(method, url, data);
export const logApiResponse = (method, url, status, data) => logger.apiResponse(method, url, status, data);
export const logUserAction = (action, details) => logger.userAction(action, details);
export const logPerformance = (operation, duration, details) => logger.performance(operation, duration, details);
export const logWebSocket = (event, data) => logger.websocket(event, data);
export const logComponentLifecycle = (component, lifecycle, props) => logger.componentLifecycle(component, lifecycle, props);
export const logStateChange = (component, stateKey, oldValue, newValue) => logger.stateChange(component, stateKey, oldValue, newValue);
export const logNavigation = (from, to) => logger.navigation(from, to);
export const logErrorBoundary = (error, errorInfo) => logger.errorBoundary(error, errorInfo);
