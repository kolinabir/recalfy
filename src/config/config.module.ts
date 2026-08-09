import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';

import { ENV, Env } from './env';

@Global()
@Module({
  imports: [NestConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] })],
  providers: [
    {
      provide: ENV,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new Env(config),
    },
  ],
  exports: [ENV],
})
export class AppConfigModule {}
