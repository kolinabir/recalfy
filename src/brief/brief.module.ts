import { Module } from '@nestjs/common';

import { BotModule } from '../bot/bot.module';
import { BrainModule } from '../brain/brain.module';
import { LlmModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { RemindersModule } from '../reminders/reminders.module';
import { ChannelsModule } from '../channels/channels.module';
import { BriefComposer } from './brief-composer';
import { BriefScheduler } from './brief.scheduler';

@Module({
  imports: [LlmModule, MemoryModule, RemindersModule, ChannelsModule, BrainModule, BotModule],
  providers: [BriefComposer, BriefScheduler],
})
export class BriefModule {}
