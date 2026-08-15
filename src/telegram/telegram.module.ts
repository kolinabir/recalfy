import { Module } from '@nestjs/common';

import { SubscriptionsModule } from '../billing/subscriptions.module';
import { LinkModule } from '../channels/link.module';
import { MemoryModule } from '../memory/memory.module';
import { TelegramAdapter } from './telegram.adapter';
import { WebhookSecretGuard } from './webhook-secret.guard';
import { WebhookController } from './webhook.controller';

@Module({
  // MemoryModule and SubscriptionsModule are for inline queries, which are
  // answered inside the adapter rather than through the message pipeline.
  imports: [LinkModule, MemoryModule, SubscriptionsModule],
  controllers: [WebhookController],
  providers: [TelegramAdapter, WebhookSecretGuard],
  exports: [TelegramAdapter],
})
export class TelegramModule {}
