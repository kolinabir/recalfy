import { Module } from '@nestjs/common';

import { LinkModule } from '../channels/link.module';
import { MemoryModule } from '../memory/memory.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TopicMirror } from './topic-mirror';

/**
 * Above the Telegram adapter and below the bot, rather than inside either.
 *
 * It imports TelegramModule directly instead of going through ChannelsModule,
 * which is the honest shape: topics are a Telegram feature, and routing them
 * through a channel-agnostic seam would mean four abstract methods WhatsApp
 * will never implement.
 */
@Module({
  imports: [LinkModule, MemoryModule, TelegramModule],
  providers: [TopicMirror],
  exports: [TopicMirror],
})
export class TopicsModule {}
