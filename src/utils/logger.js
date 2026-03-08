// Frontend logging utility
class FrontendLogger {
  constructor() {
    this.enabled = true;
  }

  _log(level, message, data = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Log to console
    if (level === 'error') {
      console.error(formattedMessage, data || '');
    } else if (level === 'warn') {
      console.warn(formattedMessage, data || '');
    } else {
      console.log(formattedMessage, data || '');
    }

    // Send to main process for file logging
    if (window.electronAPI) {
      // We'll add specific logging methods that call the main process
      this._sendToMain(level, message, data);
    }
  }

  _sendToMain(level, message, data) {
    // This will be implemented when we add specific IPC handlers
    // For now, we'll just use the existing console logging
  }

  info(message, data = null) {
    this._log('info', message, data);
  }

  warn(message, data = null) {
    this._log('warn', message, data);
  }

  error(message, data = null) {
    this._log('error', message, data);
  }

  debug(message, data = null) {
    this._log('debug', message, data);
  }

  // User action logging
  userAction(action, details = null) {
    this.info(`USER ${action}`, details);
  }

  // Navigation logging
  navigation(page, params = null) {
    this.info(`NAVIGATION ${page}`, params);
  }

  // Form action logging
  formAction(form, action, data = null) {
    this.info(`FORM ${form} ${action}`, data);
  }

  // API call logging
  apiCall(endpoint, method, params = null, result = null) {
    this.info(`API ${method} ${endpoint}`, { params, result });
  }

  // Error logging with context
  logError(error, context = null) {
    const errorData = {
      message: error.message || error,
      stack: error.stack,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    this.error('Frontend error', errorData);
  }

  // Performance logging
  performance(operation, duration, details = null) {
    this.info(`PERF ${operation}`, { duration: `${duration}ms`, details });
  }

  // Enable/disable logging
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// Create singleton instance
const frontendLogger = new FrontendLogger();

export default frontendLogger;