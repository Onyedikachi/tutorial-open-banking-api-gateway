import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { EntitledRequest } from '../entitlement/entitlement.middleware';
import { JwtVerifyService, VerifiedToken } from './jwt-verify.service';
import { matchRoute } from '../entitlement/route-catalog';
import { requestPath } from '../../common/request-path';

export interface AuthenticatedRequest extends EntitledRequest {
  token?: VerifiedToken;
}

@Injectable()
export class JwtVerifyMiddleware implements NestMiddleware {
  constructor(private jwtVerifyService: JwtVerifyService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const rule = matchRoute(req.method, requestPath(req));
    if (!rule?.requireBearer) {
      return next();
    }

    const authHeader = req.header('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer access token required');
    }

    try {
      req.token = await this.jwtVerifyService.verify(authHeader.substring(7));
    } catch (error: any) {
      throw new UnauthorizedException(`Invalid or expired access token: ${error.message}`);
    }

    if (req.token.client_id !== req.tpp?.clientId) {
      throw new UnauthorizedException(
        "Access token's client_id does not match the mTLS certificate's identity",
      );
    }

    next();
  }
}
