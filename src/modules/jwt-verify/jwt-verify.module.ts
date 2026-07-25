import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtVerifyService } from './jwt-verify.service';
import { JwtVerifyMiddleware } from './jwt-verify.middleware';

@Module({
  imports: [HttpModule],
  providers: [JwtVerifyService, JwtVerifyMiddleware],
  exports: [JwtVerifyService, JwtVerifyMiddleware],
})
export class JwtVerifyModule {}
