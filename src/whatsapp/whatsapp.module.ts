import { Module } from '@nestjs/common';

import { LinkModule } from '../channels/link.module';
import { GraphClient } from './graph.client';
import { SignatureGuard } from './signature.guard';
import { WhatsAppWebhookController } from './webhook.controller';
import { WhatsAppAdapter } from './whatsapp.adapter';

@Module({
  imports: [LinkModule],
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppAdapter, GraphClient, SignatureGuard],
  exports: [WhatsAppAdapter],
})
export class WhatsAppModule {}
