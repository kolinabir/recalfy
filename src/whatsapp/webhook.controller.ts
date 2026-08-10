import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

import { ENV, Env } from '../config/env';
import { WhatsAppWebhook } from './inbound';
import { SignatureGuard } from './signature.guard';
import { WhatsAppAdapter } from './whatsapp.adapter';

export const WEBHOOK_PATH = 'whatsapp/webhook';

@Controller(WEBHOOK_PATH)
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly adapter: WhatsAppAdapter,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Meta's one-time handshake, run when you press "Verify and save" in the
   * app dashboard and again whenever the callback URL changes. It sends the
   * verify token you typed there; echo `hub.challenge` back as plain text and
   * the subscription goes live.
   *
   * Deliberately outside SignatureGuard: there is no body to sign, and the
   * shared token is the credential.
   */
  @Get()
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    if (mode !== 'subscribe' || !token || !challenge || !this.tokenMatches(token)) {
      this.logger.warn('Rejected webhook verification with a bad mode or token');
      throw new ForbiddenException();
    }

    this.logger.log('Webhook verified by Meta');
    return challenge;
  }

  /**
   * Acks now, works later. A model call takes seconds and Meta retries a
   * webhook it considers slow — which would replay the same message — so the
   * response must not wait on the work.
   */
  @Post()
  @HttpCode(200)
  @UseGuards(SignatureGuard)
  receive(@Body() body: WhatsAppWebhook): { ok: true } {
    void this.adapter.dispatch(body).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed handling webhook: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
    return { ok: true };
  }

  private tokenMatches(presented: string): boolean {
    const left = Buffer.from(presented);
    const right = Buffer.from(this.env.whatsappVerifyToken);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
