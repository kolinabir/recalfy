import { Module } from '@nestjs/common';

import { LlmModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { RemindersModule } from '../reminders/reminders.module';
import { TrackerModule } from '../tracker/tracker.module';
import { BrainService } from './brain.service';
import { ConversationWindow } from './conversation-window';
import { HistorySearch } from './history-search';
import { SearchHistoryTool } from './tools/search-history.tool';
import { SearchMemoryTool } from './tools/search-memory.tool';
import { CancelReminderTool } from './tools/cancel-reminder.tool';
import { ConfigureTrackerTool } from './tools/configure-tracker.tool';
import { ExportMemoryTool } from './tools/export-memory.tool';
import { ForgetTool } from './tools/forget.tool';
import { ListRemindersTool } from './tools/list-reminders.tool';
import { RecallSourceTool } from './tools/recall-source.tool';
import { RememberTool } from './tools/remember.tool';
import { RemindTool } from './tools/remind.tool';
import { RevealSecretTool } from './tools/reveal-secret.tool';
import { ReportTool } from './tools/report.tool';
import { SetDailyBriefTool } from './tools/set-daily-brief.tool';
import { SetEveningReflectionTool } from './tools/set-evening-reflection.tool';
import { SetQuietHoursTool } from './tools/set-quiet-hours.tool';
import { SetTimezoneTool } from './tools/set-timezone.tool';
import { TrackTool } from './tools/track.tool';
import { UpdateEntryTool } from './tools/update-entry.tool';
import { TOOLS, Tool } from './tools/tool';
import { ToolExecutor } from './tools/tool-executor';

/** Everything the model can do. A new capability is one class and one line. */
const TOOL_CLASSES = [
  RememberTool,
  ForgetTool,
  SetTimezoneTool,
  RemindTool,
  ListRemindersTool,
  CancelReminderTool,
  SetDailyBriefTool,
  SetEveningReflectionTool,
  SetQuietHoursTool,
  SearchMemoryTool,
  SearchHistoryTool,
  RecallSourceTool,
  RevealSecretTool,
  ExportMemoryTool,
  TrackTool,
  UpdateEntryTool,
  ReportTool,
  ConfigureTrackerTool,
];

@Module({
  imports: [LlmModule, MemoryModule, RemindersModule, TrackerModule],
  providers: [
    HistorySearch,
    ...TOOL_CLASSES,
    { provide: TOOLS, useFactory: (...tools: Tool[]) => tools, inject: TOOL_CLASSES },
    ToolExecutor,
    ConversationWindow,
    BrainService,
  ],
  exports: [BrainService, ConversationWindow],
})
export class BrainModule {}
