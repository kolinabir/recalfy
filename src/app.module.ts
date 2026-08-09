import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { BotModule } from './bot/bot.module';
import { AppConfigModule } from './config/config.module';
import { HealthController } from './health.controller';
import { MongoModule } from './mongo/mongo.module';
import { RemindersModule } from './reminders/reminders.module';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    MongoModule,
    RemindersModule,
    BotModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
