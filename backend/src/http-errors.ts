import { BadRequestException } from '@nestjs/common';

// A 400 listing every reason the input was rejected, so the caller (an
// operator on the admin endpoints, a client of the Match endpoint) can fix
// them all at once.
export function rejected(reasons: string[]): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: reasons,
  });
}
