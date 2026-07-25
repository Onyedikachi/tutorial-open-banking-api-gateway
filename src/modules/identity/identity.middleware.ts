import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { EntitlementService } from '../entitlement/entitlement.service';

export interface GatewayRequest extends Request {
  tpp?: { clientId: string; name: string; accessRules: string[] };
}

/**
 * Verifies the request came through nginx's mTLS termination (shared
 * secret, fails closed) and that the presented client certificate's CN
 * resolves to a registered TPP in tutorial-open-api's registry. Ported
 * from tutorial-open-api's v1 MTLSMiddleware - the logic is identical,
 * it's just running one layer further out now.
 */
@Injectable()
export class IdentityMiddleware implements NestMiddleware {
  constructor(
    private configService: ConfigService,
    private entitlementService: EntitlementService,
  ) {}

  async use(req: GatewayRequest, res: Response, next: NextFunction) {
    this.verifyGatewaySecret(req);

    const verify = req.header('x-ssl-client-verify');
    if (verify !== 'SUCCESS') {
      throw new UnauthorizedException('mTLS client certificate required or not verified');
    }

    const dn = req.header('x-ssl-client-s-dn');
    const cn = dn ? this.parseDnField(dn, 'CN') : undefined;
    if (!cn) {
      throw new UnauthorizedException('Client certificate did not present a subject CN');
    }

    const participant = await this.entitlementService.getParticipant(cn);
    if (!participant) {
      throw new UnauthorizedException(`'${cn}' is not a registered Open Banking participant`);
    }

    req.tpp = participant;
    next();
  }

  private verifyGatewaySecret(req: Request): void {
    const expected = this.configService.get<string>('MTLS_GATEWAY_SECRET');
    if (!expected) {
      throw new UnauthorizedException('MTLS_GATEWAY_SECRET unset - refusing all requests');
    }
    const provided = req.header('x-gateway-secret') ?? '';
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);
    const valid =
      expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
    if (!valid) {
      throw new UnauthorizedException('Request did not originate from the mTLS-terminating proxy');
    }
  }

  private parseDnField(dn: string, field: string): string | undefined {
    const parts = dn.includes(',') ? dn.split(',') : dn.split('/');
    for (const part of parts) {
      const [key, value] = part.trim().split('=');
      if (key === field) return value;
    }
    return undefined;
  }
}
