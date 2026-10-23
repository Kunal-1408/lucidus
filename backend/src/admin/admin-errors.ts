import { BadRequestException } from '@nestjs/common';

// A 400 listing every reason the input was rejected, so the operator can
// fix them all at once.
export function rejected(reasons: string[]): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: reasons,
  });
}

// Whether a write failed on a unique index.
export function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 11000
  );
}
