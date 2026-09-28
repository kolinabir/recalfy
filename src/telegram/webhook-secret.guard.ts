import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

import { ENV, Env } from '../config/env';

export const SECRET_TOKEN_HEADER = 'x-telegram-bot-api-secret-token';

/**
 * Telegram echoes the `secret_token` given to setWebhook back on every call.
 * Anything without it never reaches the bot — the webhook URL is public.
 */
@Injectable()
export class WebhookSecretGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSecretGuard.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    // Polling installs never set a secret, and nothing legitimate posts here.
    if (this.env.telegramMode === 'polling') return false;

    const request = context.switchToHttp().getRequest<Request>();
    const presented = request.header(SECRET_TOKEN_HEADER);

    if (!presented || !matches(presented, this.env.webhookSecret)) {
      this.logger.warn('Rejected webhook call with a bad or missing secret token');
      return false;
    }
    return true;
  }
}

function matches(presented: string, expected: string): boolean {
  const left = Buffer.from(presented);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
