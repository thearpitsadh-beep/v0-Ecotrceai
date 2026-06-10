import { LogEntry } from '../types/api.types';

class LoggerService {
  private isDev = process.env.NODE_ENV !== 'production';
  private logs: LogEntry[] = [];

  log(entry: Omit<LogEntry, 'timestamp'>) {
    const fullEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(fullEntry);

    // Console output based on level
    if (this.isDev) {
      const prefix = `[${fullEntry.service}] ${fullEntry.action}`;
      switch (fullEntry.level) {
        case 'error':
          console.error(
            prefix,
            fullEntry.error_code ? `(${fullEntry.error_code})` : '',
            fullEntry.error_message || ''
          );
          break;
        case 'warn':
          console.warn(prefix, fullEntry);
          break;
        case 'debug':
          console.debug(prefix, fullEntry);
          break;
        default:
          console.log(prefix, fullEntry);
      }
    }
  }

  info(service: string, action: string, metadata?: Record<string, any>) {
    this.log({
      level: 'info',
      service,
      action,
      status: 'success',
      ...metadata,
    });
  }

  warn(service: string, action: string, metadata?: Record<string, any>) {
    this.log({
      level: 'warn',
      service,
      action,
      status: 'failure',
      ...metadata,
    });
  }

  error(
    service: string,
    action: string,
    code: string,
    message: string,
    metadata?: Record<string, any>
  ) {
    this.log({
      level: 'error',
      service,
      action,
      status: 'failure',
      error_code: code,
      error_message: message,
      ...metadata,
    });
  }

  debug(service: string, action: string, metadata?: Record<string, any>) {
    this.log({
      level: 'debug',
      service,
      action,
      status: 'success',
      ...metadata,
    });
  }

  // Get logs for analysis (in production, send to external logging service)
  getLogs(filter?: { level?: string; service?: string; limit?: number }) {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter((l) => l.level === filter.level);
    }
    if (filter?.service) {
      filtered = filtered.filter((l) => l.service === filter.service);
    }

    const limit = filter?.limit || 100;
    return filtered.slice(-limit);
  }

  // Get quota usage stats
  getQuotaStats() {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentHour = this.logs.filter((l) => new Date(l.timestamp) > hourAgo);
    const recentDay = this.logs.filter((l) => new Date(l.timestamp) > dayAgo);

    return {
      lastHour: {
        requests: recentHour.length,
        tokens: recentHour.reduce((sum, l) => sum + (l.tokens_used || 0), 0),
        errors: recentHour.filter((l) => l.status === 'failure').length,
      },
      lastDay: {
        requests: recentDay.length,
        tokens: recentDay.reduce((sum, l) => sum + (l.tokens_used || 0), 0),
        errors: recentDay.filter((l) => l.status === 'failure').length,
      },
    };
  }
}

export const loggerService = new LoggerService();
