import { Module } from '@nestjs/common';

import { LinkModule } from '../channels/link.module';
import { TelegramAdapter } from './telegram.adapter';
import { WebhookSecretGuard } from './webhook-secret.guard';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [LinkModule],
  controllers: [WebhookController],
  providers: [TelegramAdapter, WebhookSecretGuard],
  exports: [TelegramAdapter],
})
export class TelegramModule {}
