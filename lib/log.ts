import winston from 'winston';

export const logTemplate = (info: winston.Logform.TransformableInfo) =>
  `${info.timestamp} [${info.level}] ${info.message}`;

export function createLogger(level = process.env.LOG_LEVEL ?? 'info') {
  return winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(logTemplate),
    ),
    transports: [new winston.transports.Console()],
  });
}

export const logger = createLogger();
