import { Module } from '@nestjs/common';

import { MongoModule } from '../mongo/mongo.module';
import { TrackerStore } from './tracker.store';

@Module({
  imports: [MongoModule],
  providers: [TrackerStore],
  exports: [TrackerStore],
})
export class TrackerModule {}
