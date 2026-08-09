import { Module } from '@nestjs/common';

import { MongoModule } from '../mongo/mongo.module';
import { Ingress } from './ingress';
import { LinkStore } from './link.store';
import { TelegramIngress } from './telegram.ingress';
import { WebhookSecretGuard } from './webhook-secret.guard';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [MongoModule],
  controllers: [WebhookController],
  providers: [
    TelegramIngress,
    WebhookSecretGuard,
    LinkStore,
    { provide: Ingress, useExisting: TelegramIngress },
  ],
  exports: [Ingress, TelegramIngress],
})
export class TelegramModule {}
