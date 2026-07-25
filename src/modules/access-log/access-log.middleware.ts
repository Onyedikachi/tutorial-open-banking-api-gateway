import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../jwt-verify/jwt-verify.middleware';
import { requestPath } from '../../common/request-path';

/**
 * One structured line per request - the "analytics" a real API gateway
 * product surfaces (who called what, how often, how fast, with what
 * outcome). A production system would ship this to a log/metrics
 * pipeline instead of stdout.
 */
@Injectable()
export class AccessLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('AccessLog');

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      this.logger.log(
        JSON.stringify({
          clientId: req.tpp?.clientId ?? 'unknown',
          product: req.matchedProduct ?? 'none',
          method: req.method,
          path: requestPath(req),
          status: res.statusCode,
          latencyMs: Date.now() - start,
        }),
      );
    });
    next();
  }
}
