import { Module } from '@nestjs/common';

import { Ingress } from './ingress';
import { TelegramIngress } from './telegram.ingress';
import { WebhookSecretGuard } from './webhook-secret.guard';
import { WebhookController } from './webhook.controller';

@Module({
  controllers: [WebhookController],
  providers: [
    TelegramIngress,
    WebhookSecretGuard,
    { provide: Ingress, useExisting: TelegramIngress },
  ],
  exports: [Ingress, TelegramIngress],
})
export class TelegramModule {}
