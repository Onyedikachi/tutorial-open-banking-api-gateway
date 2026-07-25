import { Module } from '@nestjs/common';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { RedisProvider } from './redis.provider';

@Module({
  providers: [RateLimitMiddleware, RedisProvider],
  exports: [RateLimitMiddleware, RedisProvider],
})
export class RateLimitModule {}
