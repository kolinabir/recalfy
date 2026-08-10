import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import type { Update } from 'grammy/types';

import { TelegramAdapter } from './telegram.adapter';
import { WebhookSecretGuard } from './webhook-secret.guard';

export const WEBHOOK_PATH = 'telegram/webhook';

@Controller(WEBHOOK_PATH)
@UseGuards(WebhookSecretGuard)
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly adapter: TelegramAdapter) {}

  /**
   * Acks now, works later. A model call takes seconds and Telegram backs off
   * webhooks that are slow to answer, so the response must not wait on it.
   */
  @Post()
  @HttpCode(200)
  receive(@Body() update: Update): { ok: true } {
    void this.adapter.dispatch(update).catch((error: unknown) => this.report(update, error));
    return { ok: true };
  }

  private report(update: Update, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `Failed handling update ${update.update_id}: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
