import { Module } from '@nestjs/common';

import { BrainModule } from '../brain/brain.module';
import { MemoryModule } from '../memory/memory.module';
import { TelegramModule } from '../telegram/telegram.module';
import { BotService } from './bot.service';
import { ConversationLog } from './conversation-log';
import { Responder } from './responder';

@Module({
  imports: [TelegramModule, MemoryModule, BrainModule],
  providers: [ConversationLog, Responder, BotService],
  exports: [ConversationLog],
})
export class BotModule {}
