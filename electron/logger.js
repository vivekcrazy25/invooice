const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logDir = null) {
    this.logDir = logDir;
    this.logFile = null;
    this.initialized = false;
  }

  init(logDir) {
    if (this.initialized) return;

    this.logDir = logDir;
    this.logFile = path.join(this.logDir, 'accountingpro.log');

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.initialized = true;
    this.info('Logger initialized', { logFile: this.logFile });
  }

  _formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (data) {
      return `${baseMessage} ${JSON.stringify(data, null, 2)}\n`;
    }

    return `${baseMessage}\n`;
  }

  _writeToFile(message) {
    if (!this.initialized || !this.logFile) return;

    try {
      fs.appendFileSync(this.logFile, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  _log(level, message, data = null) {
    const formattedMessage = this._formatMessage(level, message, data);

    // Always log to console
    if (level === 'error') {
      console.error(`[${level.toUpperCase()}] ${message}`, data || '');
    } else if (level === 'warn') {
      console.warn(`[${level.toUpperCase()}] ${message}`, data || '');
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }

    // Write to file
    this._writeToFile(formattedMessage);
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

  // Database operation logging
  dbOperation(operation, table, data = null) {
    this.info(`DB ${operation}`, { table, data });
  }

  // API call logging
  apiCall(endpoint, method, params = null, result = null) {
    this.info(`API ${method} ${endpoint}`, { params, result });
  }

  // User action logging
  userAction(action, userId = null, details = null) {
    this.info(`USER ${action}`, { userId, details });
  }

  // Import/Export logging
  importOperation(type, filePath, result) {
    this.info(`IMPORT ${type}`, { filePath, result });
  }

  exportOperation(type, filePath, data) {
    this.info(`EXPORT ${type}`, { filePath, recordCount: data?.length || 0 });
  }

  // Application lifecycle logging
  appStart(version, nodeVersion) {
    this.info('Application started', { version, nodeVersion, platform: process.platform });
  }

  appExit(code) {
    this.info('Application exited', { exitCode: code });
  }

  // Error logging with stack trace
  logError(error, context = null) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context
    };
    this.error('Application error', errorData);
  }

  // Performance logging
  performance(operation, duration, details = null) {
    this.info(`PERF ${operation}`, { duration: `${duration}ms`, details });
  }

  // Get log file path
  getLogFile() {
    return this.logFile;
  }

  // Get recent logs
  getRecentLogs(lines = 100) {
    if (!this.initialized || !fs.existsSync(this.logFile)) {
      return 'No log file available';
    }

    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      return logLines.slice(-lines).join('\n');
    } catch (error) {
      return `Error reading log file: ${error.message}`;
    }
  }

  // Clear old logs (keep last N days)
  rotateLogs(daysToKeep = 30) {
    if (!this.initialized || !fs.existsSync(this.logFile)) return;

    try {
      const stats = fs.statSync(this.logFile);
      const fileAge = Date.now() - stats.mtime.getTime();
      const daysOld = fileAge / (1000 * 60 * 60 * 24);

      if (daysOld > daysToKeep) {
        const backupFile = `${this.logFile}.${new Date().toISOString().split('T')[0]}`;
        fs.renameSync(this.logFile, backupFile);
        this.info('Log file rotated', { backupFile });
      }
    } catch (error) {
      this.error('Failed to rotate logs', { error: error.message });
    }
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;