import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null && 'type' in body) {
        // Already a ProblemDetails-shaped body.
        res.status(status).type('application/problem+json').send(body);
        return;
      }

      res
        .status(status)
        .type('application/problem+json')
        .send({
          type: `https://api.openbanking.ng/errors/gateway-${status}`,
          title: exception.name,
          status,
          detail: typeof body === 'string' ? body : (body as any)?.message || exception.message,
          instance: req.path,
        });
      return;
    }

    // eslint-disable-next-line no-console
    console.error(exception);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .type('application/problem+json')
      .send({
        type: 'https://api.openbanking.ng/errors/gateway-internal-error',
        title: 'Internal Gateway Error',
        status: 500,
        detail: 'An unexpected error occurred at the API gateway',
        instance: req.path,
      });
  }
}
