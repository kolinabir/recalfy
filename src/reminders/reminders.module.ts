import { Module } from '@nestjs/common';

import { TelegramModule } from '../telegram/telegram.module';
import { ReminderDelivery } from './reminder-delivery';
import { ReminderScheduler } from './reminder.scheduler';
import { ReminderStore } from './reminder.store';

@Module({
  imports: [TelegramModule],
  providers: [ReminderStore, ReminderScheduler, ReminderDelivery],
  exports: [ReminderStore],
})
export class RemindersModule {}
