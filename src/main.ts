import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ENV, Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.enableShutdownHooks();

  const env = app.get<Env>(ENV);
  await app.listen(env.port, '127.0.0.1');

  new Logger('Bootstrap').log(`Listening on 127.0.0.1:${env.port} — Caddy fronts this`);
}

void bootstrap();
