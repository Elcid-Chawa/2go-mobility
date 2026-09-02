import winston from 'winston';
import { env } from './env';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message} ${info.metadata ? JSON.stringify(info.metadata) : ''}`
  )
);

const transports = [
  new winston.transports.Console(),
];

export const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});
