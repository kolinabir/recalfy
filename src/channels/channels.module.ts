import { Module } from '@nestjs/common';

import { MemoryModule } from '../memory/memory.module';
import { TelegramAdapter } from '../telegram/telegram.adapter';
import { TelegramModule } from '../telegram/telegram.module';
import { WhatsAppAdapter } from '../whatsapp/whatsapp.adapter';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { CHANNEL_ADAPTERS, ChannelAdapter } from './channel';
import { LinkModule } from './link.module';
import { Outbox } from './outbox';

/**
 * Where the adapters are collected and the router is built. Adding a third
 * chat network is an import, an adapter, and one entry in the factory below —
 * nothing above this module changes.
 */
@Module({
  imports: [LinkModule, MemoryModule, TelegramModule, WhatsAppModule],
  providers: [
    Outbox,
    {
      provide: CHANNEL_ADAPTERS,
      useFactory: (...adapters: ChannelAdapter[]) => adapters,
      inject: [TelegramAdapter, WhatsAppAdapter],
    },
  ],
  // CHANNEL_ADAPTERS is exported for BotService, which subscribes to every
  // adapter's inbound stream. Everything else should reach for Outbox.
  exports: [Outbox, LinkModule, CHANNEL_ADAPTERS],
})
export class ChannelsModule {}
