import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ProblemDetails } from '@induinventory/contracts';
import { AppError } from './errors';

export function toProblemDetails(error: AppError, request: FastifyRequest): ProblemDetails {
  const problem: ProblemDetails = {
    type: `urn:induinventory:problem:${error.code.toLowerCase().replaceAll('_', '-')}`,
    title: error.title,
    status: error.status,
    detail: error.message,
    instance: request.url,
    requestId: request.id,
    code: error.code,
  };

  if (error.fieldErrors.length > 0) {
    problem.errors = error.fieldErrors;
  }

  const retryAfter = error.headers['retry-after'];
  if (retryAfter) {
    problem.retryAfterSeconds = Number.parseInt(retryAfter, 10);
  }

  return problem;
}

export function sendProblem(reply: FastifyReply, error: AppError, request: FastifyRequest): void {
  for (const [header, value] of Object.entries(error.headers)) {
    reply.header(header, value);
  }
  reply.code(error.status).type('application/problem+json').send(toProblemDetails(error, request));
}
