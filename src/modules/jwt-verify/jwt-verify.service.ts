import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

export interface VerifiedToken {
  sub: string;
  client_id: string;
  scope: string[];
}

/**
 * Verifies OAuth2 access tokens using the bank's published JWKS
 * (GET /auth/jwks), the way a real API gateway product validates bearer
 * tokens itself rather than calling back to the auth server on every
 * request. Refreshed periodically; a verification failure against a
 * kid we don't recognize triggers one immediate refetch, to tolerate key
 * rotation.
 */
@Injectable()
export class JwtVerifyService implements OnModuleInit {
  private readonly logger = new Logger(JwtVerifyService.name);
  private pemByKid = new Map<string, string>();

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async onModuleInit() {
    await this.refreshJwks().catch((err) =>
      this.logger.warn(`Initial JWKS fetch failed, will retry on first verify: ${err.message}`),
    );
    setInterval(() => this.refreshJwks().catch(() => undefined), 10 * 60 * 1000);
  }

  private async refreshJwks(): Promise<void> {
    const coreBankingUrl = this.configService.get<string>('CORE_BANKING_URL');
    const response = await firstValueFrom(this.httpService.get(`${coreBankingUrl}/auth/jwks`));
    const keys = response.data.keys ?? [];
    this.pemByKid = new Map(
      keys.map((key: any) => [key.kid ?? 'default', jwkToPem(key)]),
    );
  }

  async verify(token: string): Promise<VerifiedToken> {
    const decoded = jwt.decode(token, { complete: true });
    const kid = (decoded?.header as any)?.kid ?? 'default';

    if (!this.pemByKid.has(kid)) {
      await this.refreshJwks().catch(() => undefined);
    }

    const pem = this.pemByKid.get(kid) ?? [...this.pemByKid.values()][0];
    if (!pem) {
      throw new Error('No JWKS key available to verify the token');
    }

    return jwt.verify(token, pem, { algorithms: ['RS256'] }) as unknown as VerifiedToken;
  }
}
