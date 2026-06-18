import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { initSentry } from './common/sentry';
import { isAllowedOrigin } from './common/cors';

async function bootstrap() {
  if (initSentry()) Logger.log('Sentry enabled', 'Bootstrap');

  const app = await NestFactory.create(AppModule, { cors: false, bufferLogs: true, rawBody: true });
  app.useLogger(app.get(PinoLogger));
  const config = app.get(ConfigService);

  const prefix = config.get<string>('apiPrefix') ?? 'api';
  app.setGlobalPrefix(prefix);

  // Security headers. crossOriginResourcePolicy relaxed so the SPA can load assets.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Behind a proxy/load balancer (Render/Fly/etc.) — trust X-Forwarded-* for real client IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Flush DB connections, queues and sockets cleanly on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // Allow the configured web origin(s) + Vercel preview domains.
  app.enableCors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // OpenAPI docs at /<prefix>/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('manaTask API')
    .setDescription('Multi-tenant task management API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-workspace-id', in: 'header' }, 'workspace')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port);
  Logger.log(`manaTask API running on http://localhost:${port}/${prefix}`, 'Bootstrap');
}

bootstrap();
