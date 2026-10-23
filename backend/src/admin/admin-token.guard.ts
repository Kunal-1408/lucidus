import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export const ADMIN_TOKEN_HEADER = 'x-admin-token';

// Admin endpoints require the token from the ADMIN_TOKEN environment
// variable. With no token configured, every admin call is rejected.
@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_TOKEN;
    const given = context
      .switchToHttp()
      .getRequest<Request>()
      .header(ADMIN_TOKEN_HEADER);
    if (!expected || !given || !sameSecret(given, expected)) {
      throw new UnauthorizedException('Missing or wrong admin token');
    }
    return true;
  }
}

function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
