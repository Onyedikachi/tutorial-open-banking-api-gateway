import { HttpException } from '@nestjs/common';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

/**
 * Mirrors tutorial-open-api's RFC 7807 shape so clients see one consistent
 * error format across the gateway and the backend it fronts.
 */
export class ProblemDetailsException extends HttpException {
  constructor(problem: ProblemDetails) {
    super(problem, problem.status);
  }
}
