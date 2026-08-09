import { Module } from '@nestjs/common';

import { GlmClient } from './glm.client';

@Module({
  providers: [GlmClient],
  exports: [GlmClient],
})
export class LlmModule {}
