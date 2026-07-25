import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/problem-details.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(process.env.PORT ?? 4000);
  // eslint-disable-next-line no-console
  console.log(`API gateway listening on :${process.env.PORT ?? 4000} (behind nginx mTLS on :8443)`);
}
bootstrap();
