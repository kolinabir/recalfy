import { Module } from '@nestjs/common';

import { ChannelsModule } from '../channels/channels.module';
import { ReminderDelivery } from './reminder-delivery';
import { ReminderScheduler } from './reminder.scheduler';
import { ReminderStore } from './reminder.store';

@Module({
  imports: [ChannelsModule],
  providers: [ReminderStore, ReminderScheduler, ReminderDelivery],
  exports: [ReminderStore],
})
export class RemindersModule {}
