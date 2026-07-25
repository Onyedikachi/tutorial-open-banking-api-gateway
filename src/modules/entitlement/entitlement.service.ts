import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface Participant {
  clientId: string;
  name: string;
  accessRules: string[];
}

interface CacheEntry {
  participant: Participant;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000;

/**
 * Looks up a TPP's product entitlements (CBN access rules) from
 * tutorial-open-api's internal registry endpoint. Mirrors how IBM
 * APIC/Azure APIM resolve a caller's subscription/product against a
 * catalog before admitting a request - the gateway does not maintain its
 * own copy of who's registered, it asks the backend that owns that data.
 */
@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);
  private cache = new Map<string, CacheEntry>();

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getParticipant(clientId: string): Promise<Participant | undefined> {
    const cached = this.cache.get(clientId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.participant;
    }

    const coreBankingUrl = this.configService.get<string>('CORE_BANKING_URL');
    const secret = this.configService.get<string>('INTERNAL_GATEWAY_SECRET');

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${coreBankingUrl}/internal/registry/participants/${clientId}`, {
          headers: { 'X-Internal-Gateway-Secret': secret },
        }),
      );
      const participant: Participant = response.data;
      this.cache.set(clientId, { participant, expiresAt: Date.now() + CACHE_TTL_MS });
      return participant;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return undefined;
      }
      this.logger.error(`Registry lookup failed for '${clientId}': ${error.message}`);
      throw error;
    }
  }

  hasAccessRule(participant: Participant, rule: string): boolean {
    return participant.accessRules.includes(rule);
  }
}
