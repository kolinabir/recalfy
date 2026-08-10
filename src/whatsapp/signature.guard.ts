import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

import { ENV, Env } from '../config/env';

export const SIGNATURE_HEADER = 'x-hub-signature-256';

/**
 * Meta signs every webhook body with the app secret. This is the WhatsApp
 * equivalent of Telegram's secret-token header, with one sharp difference:
 * the HMAC covers the *raw* bytes, so it has to be checked before anything
 * re-serialises the JSON. `NestFactory.create(..., { rawBody: true })` in
 * main.ts is what keeps those bytes around.
 */
@Injectable()
export class SignatureGuard implements CanActivate {
  private readonly logger = new Logger(SignatureGuard.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const presented = request.header(SIGNATURE_HEADER);

    if (!presented?.startsWith('sha256=')) {
      this.logger.warn('Rejected webhook call with a missing or malformed signature');
      return false;
    }

    if (!request.rawBody) {
      // Fail closed. A body we cannot hash is a body we cannot trust, and
      // silently accepting it would defeat the whole guard.
      this.logger.error('No raw body available — is rawBody enabled in main.ts?');
      return false;
    }

    const expected = createHmac('sha256', this.env.whatsappAppSecret)
      .update(request.rawBody)
      .digest('hex');

    if (!matches(presented.slice('sha256='.length), expected)) {
      this.logger.warn('Rejected webhook call with a bad signature');
      return false;
    }
    return true;
  }
}

function matches(presented: string, expected: string): boolean {
  const left = Buffer.from(presented, 'hex');
  const right = Buffer.from(expected, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
