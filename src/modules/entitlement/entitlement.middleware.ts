import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { GatewayRequest } from '../identity/identity.middleware';
import { EntitlementService } from './entitlement.service';
import { matchRoute, PRODUCT_ACCESS_RULE } from './route-catalog';
import { ProblemDetailsException } from '../../common/problem-details.exception';
import { requestPath } from '../../common/request-path';

export interface EntitledRequest extends GatewayRequest {
  matchedProduct?: string;
}

/**
 * The core "place the key APIs behind the gateway" enforcement: matches
 * the request against the published route catalog and rejects anything
 * unpublished (404) or not entitled to this TPP (403) before it ever
 * reaches rate limiting or the backend.
 */
@Injectable()
export class EntitlementMiddleware implements NestMiddleware {
  constructor(private entitlementService: EntitlementService) {}

  use(req: EntitledRequest, res: Response, next: NextFunction) {
    const path = requestPath(req);
    const rule = matchRoute(req.method, path);
    if (!rule) {
      throw new NotFoundException(`No published gateway route for ${req.method} ${path}`);
    }

    if (rule.product) {
      const accessRule = PRODUCT_ACCESS_RULE[rule.product];
      if (!req.tpp || !this.entitlementService.hasAccessRule(req.tpp, accessRule)) {
        throw new ProblemDetailsException({
          type: 'https://api.openbanking.ng/errors/product-not-entitled',
          title: 'Product Not Entitled',
          status: 403,
          detail: `TPP '${req.tpp?.clientId}' is not entitled to the ${rule.product} product`,
          instance: path,
        });
      }
      req.matchedProduct = rule.product;
    }

    next();
  }
}
