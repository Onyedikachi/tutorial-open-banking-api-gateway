import { Module } from '@nestjs/common';
import { IdentityMiddleware } from './identity.middleware';
import { EntitlementModule } from '../entitlement/entitlement.module';

@Module({
  imports: [EntitlementModule],
  providers: [IdentityMiddleware],
  exports: [IdentityMiddleware],
})
export class IdentityModule {}
