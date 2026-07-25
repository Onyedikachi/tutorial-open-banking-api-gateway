import { All, Controller, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { AuthenticatedRequest } from '../jwt-verify/jwt-verify.middleware';

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'x-gateway-secret',
  'x-ssl-client-verify',
  'x-ssl-client-s-dn',
  'x-ssl-client-serial',
  'x-ssl-client-cert',
]);

/**
 * The gateway's only "business" route: everything that survived identity
 * verification, entitlement checks, bearer verification, and rate
 * limiting gets forwarded here, with the gateway's own trust headers
 * attached, to tutorial-open-api's internal-only endpoints.
 */
@Controller()
export class ProxyController {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  @All('*path')
  async proxy(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const coreBankingUrl = this.configService.get<string>('CORE_BANKING_URL');
    const internalSecret = this.configService.get<string>('INTERNAL_GATEWAY_SECRET');

    const forwardHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP_REQUEST_HEADERS.has(key) && typeof value === 'string') {
        forwardHeaders[key] = value;
      }
    }
    forwardHeaders['x-internal-gateway-secret'] = internalSecret ?? '';
    if (req.tpp) {
      forwardHeaders['x-tpp-client-id'] = req.tpp.clientId;
      forwardHeaders['x-tpp-access-rules'] = JSON.stringify(req.tpp.accessRules);
    }

    const response = await firstValueFrom(
      this.httpService.request({
        method: req.method as any,
        url: `${coreBankingUrl}${req.originalUrl}`,
        data: req.body,
        headers: forwardHeaders,
        validateStatus: () => true,
      }),
    );

    res.status(response.status);
    const contentType = response.headers['content-type'];
    if (typeof contentType === 'string') res.setHeader('Content-Type', contentType);
    res.send(response.data);
  }
}
