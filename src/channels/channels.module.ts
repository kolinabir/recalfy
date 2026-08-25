import { Module } from '@nestjs/common';

import { MemoryModule } from '../memory/memory.module';
import { TelegramAdapter } from '../telegram/telegram.adapter';
import { TelegramModule } from '../telegram/telegram.module';
import { CHANNEL_ADAPTERS, ChannelAdapter } from './channel';
import { LinkModule } from './link.module';
import { Outbox } from './outbox';

/**
 * Where the adapters are collected and the router is built. Adding a chat
 * network is an import, an adapter, and one entry in the factory below —
 * nothing above this module changes.
 *
 * WhatsApp is deliberately absent. Every line of it still exists —
 * `src/whatsapp/` has the adapter, the Graph client, the webhook and the
 * signature guard — it is simply not registered, which is what makes the
 * channel unreachable rather than merely hidden: no adapter means no inbound
 * handler, no `/whatsapp/webhook` route, and nothing for a pairing handshake
 * to land on. The web half is switched off at AVAILABLE_CHANNELS in
 * `web/lib/channels.ts`; both have to be flipped to bring it back.
 */
@Module({
  imports: [LinkModule, MemoryModule, TelegramModule],
  providers: [
    Outbox,
    {
      provide: CHANNEL_ADAPTERS,
      useFactory: (...adapters: ChannelAdapter[]) => adapters,
      inject: [TelegramAdapter],
    },
  ],
  // CHANNEL_ADAPTERS is exported for BotService, which subscribes to every
  // adapter's inbound stream. Everything else should reach for Outbox.
  exports: [Outbox, LinkModule, CHANNEL_ADAPTERS],
})
export class ChannelsModule {}
