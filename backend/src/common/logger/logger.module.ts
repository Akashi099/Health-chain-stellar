import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'authorization', 'cookie'];

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    sanitized[key] = SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))
      ? '[REDACTED]'
      : sanitize(value);
  }
  return sanitized;
}

export { sanitize };

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env = config.get<string>('NODE_ENV', 'development');
        const isProd = env === 'production';

        const transports: winston.transport[] = [
          new winston.transports.Console({
            format: isProd
              ? winston.format.json()
              : winston.format.combine(
                  winston.format.colorize(),
                  winston.format.simple(),
                ),
          }),
          new (winston.transports as any).DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            format: winston.format.json(),
          }),
          new (winston.transports as any).DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d',
            format: winston.format.json(),
          }),
        ];

        return {
          level: isProd ? 'info' : 'debug',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
          transports,
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
