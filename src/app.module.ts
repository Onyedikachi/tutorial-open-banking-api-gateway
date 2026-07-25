import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { IdentityModule } from './modules/identity/identity.module';
import { IdentityMiddleware } from './modules/identity/identity.middleware';
import { EntitlementModule } from './modules/entitlement/entitlement.module';
import { EntitlementMiddleware } from './modules/entitlement/entitlement.middleware';
import { JwtVerifyModule } from './modules/jwt-verify/jwt-verify.module';
import { JwtVerifyMiddleware } from './modules/jwt-verify/jwt-verify.middleware';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { RateLimitMiddleware } from './modules/rate-limit/rate-limit.middleware';
import { AccessLogModule } from './modules/access-log/access-log.module';
import { AccessLogMiddleware } from './modules/access-log/access-log.middleware';
import { ProxyModule } from './modules/proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    IdentityModule,
    EntitlementModule,
    JwtVerifyModule,
    RateLimitModule,
    AccessLogModule,
    ProxyModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Order matters: identity (who is this, are they registered) -> jwt
    // (do they have a valid, cert-bound access token, where required) ->
    // entitlement (are they allowed to call this specific product) ->
    // rate limit (are they within their quota) -> access log -> proxy.
    consumer
      .apply(
        IdentityMiddleware,
        EntitlementMiddleware,
        JwtVerifyMiddleware,
        RateLimitMiddleware,
        AccessLogMiddleware,
      )
      .forRoutes('*path');
  }
}
