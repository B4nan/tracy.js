import * as winston from 'winston';
import { grey } from 'colors/safe';
import { inspect } from 'util';

export class Logger {

  private readonly logger: winston.Logger;

  constructor(options: IOptions) {
    const formats: any[] = [winston.format.colorize({ all: false })];

    if (options.timestamp) {
      formats.push(winston.format.timestamp({ format: 'YY-MM-DD HH:mm:ss' }));
    }

    formats.push(winston.format.printf((info: any) => {
      const timestamp = options.timestamp ? `[${grey(info.timestamp)}]` : '';
      return `${timestamp}[${(info.level)}]:${'     '.substr(0, 15 - info.level.length)} ${info.message}`;
    }));

    this.logger = winston.createLogger({
      format: winston.format.combine(...formats),
      levels: options.levels || {
        [LogLevel.ERROR]: 0,
        [LogLevel.WARN]: 1,
        [LogLevel.INFO]: 2,
        [LogLevel.DEBUG]: 3,
        [LogLevel.VERBOSE]: 4,
        [LogLevel.SILLY]: 5,
      },
      silent: options.silent,
      transports: [
        new winston.transports.Console({ level: options.level }),
      ],
    });
  }

  public info(...args: any[]) {
    this.echo(LogLevel.INFO, ...args);
  }

  public debug(...args: any[]) {
    this.echo(LogLevel.DEBUG, ...args);
  }

  public verbose(...args: any[]) {
    this.echo(LogLevel.VERBOSE, ...args);
  }

  public silly(...args: any[]) {
    this.echo(LogLevel.SILLY, ...args);
  }

  public warn(...args: any[]) {
    this.echo(LogLevel.WARN, ...args);
  }

  public error(...args: any[]) {
    this.echo(LogLevel.ERROR, ...args);

    if (args[0].previous) {
      this.error(args[0].previous);
    }
  }

  private echo(level: string, ...args: any[]) {
    (this.logger as any)[level](args.map(arg => {
      if (typeof arg === 'object') {
        return inspect(arg, true, 3, true);
      }

      return arg;
    }).join(' '));
  }

}

export interface IOptions {
  level: string;
  silent?: boolean;
  timestamp?: boolean;
  levels?: { [level: string]: number };
}

export enum LogLevel {
  ERROR = 'error',      // 1
  WARN = 'warn',        // 2
  INFO = 'info',        // 3
  DEBUG = 'debug',      // 4
  VERBOSE = 'verbose',  // 5
  SILLY = 'silly',      // 6
}
