import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('REDIS_HOST', 'localhost');
        const isAwsRedis = host.includes('cache.amazonaws.com');
        const isDev = configService.get('NODE_ENV') !== 'production';

        const client = new Redis({
          host: isDev && isAwsRedis ? '127.0.0.1' : host,
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: (times) => {
            if (times > 2) return null; // stop retrying after 2 attempts
            return 200;
          },
        });
        client.on('connect', () => console.log('Redis connected'));
        client.on('error', (err) => {
          // Silent warning when Redis is unreachable locally
          if (process.env.NODE_ENV !== 'production') return;
          console.error('Redis connection warning:', err.message);
        });
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
