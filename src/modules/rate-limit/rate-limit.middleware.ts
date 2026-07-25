import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import type Redis from 'ioredis';
import { AuthenticatedRequest } from '../jwt-verify/jwt-verify.middleware';
import { PRODUCT_RATE_LIMIT } from '../entitlement/route-catalog';
import { ProblemDetailsException } from '../../common/problem-details.exception';
import { REDIS_CLIENT } from './redis.provider';
import { requestPath } from '../../common/request-path';

/**
 * Fixed-window rate limiting per clientId + product - the other half of
 * "place the key APIs behind the gateway": a real API gateway product's
 * core value isn't just auth, it's protecting the backend from any single
 * TPP overwhelming it.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const product = req.matchedProduct ?? 'default';
    const limit = PRODUCT_RATE_LIMIT[product as keyof typeof PRODUCT_RATE_LIMIT];
    const clientId = req.tpp?.clientId ?? 'anonymous';
    const windowMinute = Math.floor(Date.now() / 60_000);
    const key = `ratelimit:${clientId}:${product}:${windowMinute}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 60);
    }

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - count)));

    if (count > limit) {
      throw new ProblemDetailsException({
        type: 'https://api.openbanking.ng/errors/rate-limit-exceeded',
        title: 'Rate Limit Exceeded',
        status: 429,
        detail: `'${clientId}' exceeded ${limit} requests/minute for product '${product}'`,
        instance: requestPath(req),
      });
    }

    next();
  }
}
