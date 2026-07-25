import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EntitlementService } from './entitlement.service';
import { EntitlementMiddleware } from './entitlement.middleware';

@Module({
  imports: [HttpModule],
  providers: [EntitlementService, EntitlementMiddleware],
  exports: [EntitlementService, EntitlementMiddleware],
})
export class EntitlementModule {}
