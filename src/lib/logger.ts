// src/lib/logger.ts

// Centralized logging utility
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  organizationId?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  requestId?: string;
  component?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    digest?: string;
  };
  source: 'client' | 'server';
  environment: string;
}

class Logger {
  private static instance: Logger;
  private readonly environment: string;
  private readonly enableConsoleLogging: boolean;
  private readonly logLevel: LogLevel;

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.enableConsoleLogging = process.env.NODE_ENV === 'development' || process.env.ENABLE_CONSOLE_LOGGING === 'true';
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'fatal': return LogLevel.FATAL;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error
  ): LogEntry {
    const isClient = typeof window !== 'undefined';
    
    const baseContext: LogContext = {
      ...context,
      url: isClient ? window.location.href : context.url,
      userAgent: isClient ? navigator.userAgent : context.userAgent,
    };

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: baseContext,
      source: isClient ? 'client' : 'server',
      environment: this.environment,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        digest: (error as any).digest,
      };
    }

    return logEntry;
  }

  private logToConsole(logEntry: LogEntry): void {
    if (!this.enableConsoleLogging) return;

    const { timestamp, level, message, context, error } = logEntry;
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, context, error);
        break;
      case LogLevel.INFO:
        console.info(logMessage, context, error);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, context, error);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logMessage, context, error);
        break;
      default:
        console.log(logMessage, context, error);
    }
  }

  public async log(level: LogLevel, message: string, context?: LogContext, error?: Error): Promise<void> {
    if (!this.shouldLog(level)) return;

    const logEntry = this.createLogEntry(level, message, context, error);
    
    // Log to console
    this.logToConsole(logEntry);

  }

  public async debug(message: string, context?: LogContext): Promise<void> {
    await this.log(LogLevel.DEBUG, message, context);
  }

  public async info(message: string, context?: LogContext): Promise<void> {
    await this.log(LogLevel.INFO, message, context);
  }

  public async warn(message: string, context?: LogContext, error?: Error): Promise<void> {
    await this.log(LogLevel.WARN, message, context, error);
  }

  public async error(message: string, context?: LogContext, error?: Error): Promise<void> {
    await this.log(LogLevel.ERROR, message, context, error);
  }

  public async fatal(message: string, context?: LogContext, error?: Error): Promise<void> {
    await this.log(LogLevel.FATAL, message, context, error);
  }

  // Performance logging
  public async performance(operation: string, duration: number, context?: LogContext): Promise<void> {
    await this.info(`Performance: ${operation} completed in ${duration}ms`, {
      ...context,
      operation,
      duration,
    });
  }

  // User action logging
  public async userAction(action: string, userId: string, context?: LogContext): Promise<void> {
    await this.info(`User action: ${action}`, {
      ...context,
      userId,
      operation: action,
    });
  }

  // API request logging
  public async apiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration?: number,
    context?: LogContext
  ): Promise<void> {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    await this.log(level, `API ${method} ${url} - ${statusCode}`, {
      ...context,
      operation: `${method} ${url}`,
      duration,
      metadata: { statusCode },
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext, error?: Error) => logger.warn(message, context, error);
export const logError = (message: string, context?: LogContext, error?: Error) => logger.error(message, context, error);
export const logFatal = (message: string, context?: LogContext, error?: Error) => logger.fatal(message, context, error);
export const logPerformance = (operation: string, duration: number, context?: LogContext) => logger.performance(operation, duration, context);
export const logUserAction = (action: string, userId: string, context?: LogContext) => logger.userAction(action, userId, context);
export const logApiRequest = (method: string, url: string, statusCode: number, duration?: number, context?: LogContext) => logger.apiRequest(method, url, statusCode, duration, context);

// Performance measurement utility
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      await logPerformance(operation, duration, context);
      resolve(result);
    } catch (error) {
      const duration = performance.now() - startTime;
      await logError(`${operation} failed after ${duration}ms`, context, error as Error);
      reject(error);
    }
  });
} 