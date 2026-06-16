import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import IORedis from 'ioredis';
import { RedisThrottlerStorage } from './common/redis-throttler.storage';
import configuration from './config/configuration';
import { validateEnv } from './config/validate';
import { ALL_ENTITIES } from './database/entities';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { CommonModule } from './common/common.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ActivityModule } from './modules/activity/activity.module';
import { MailModule } from './modules/mail/mail.module';
import { StorageModule } from './modules/storage/storage.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ConfigModule as ConfigFeatureModule } from './modules/config/config.module';
import { SearchModule } from './modules/search/search.module';
import { SharingModule } from './modules/sharing/sharing.module';
import { WorkLogsModule } from './modules/worklogs/worklogs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Support env at the API folder or at the monorepo root.
      envFilePath: ['.env', '../../.env'],
      // Fail fast on insecure/missing config in production.
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('logLevel') ?? 'info',
          transport:
            config.get<string>('nodeEnv') !== 'production'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          // Never log secrets/tokens.
          redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-workspace-id"]'],
          autoLogging: { ignore: (req: any) => req.url === '/api/health' },
          customProps: () => ({ context: 'HTTP' }),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('db.url');
        const ssl = config.get<boolean>('db.ssl')
          ? { rejectUnauthorized: false }
          : false;
        return {
          type: 'postgres' as const,
          ...(url
            ? { url }
            : {
                host: config.get<string>('db.host'),
                port: config.get<number>('db.port'),
                username: config.get<string>('db.username'),
                password: config.get<string>('db.password'),
                database: config.get<string>('db.name'),
              }),
          ssl,
          entities: ALL_ENTITIES,
          migrations: [__dirname + '/database/migrations/*.{ts,js}'],
          migrationsTableName: 'manatask_migrations',
          migrationsRun: config.get<boolean>('db.migrationsRun'),
          synchronize: config.get<boolean>('db.synchronize'),
          autoLoadEntities: true,
        };
      },
    }),
    // Rate limiting — 100 req / 60s per IP by default; tightened per-route via @Throttle.
    // Uses Redis storage when REDIS_URL is set so limits hold across instances.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('redisUrl');
        return {
          throttlers: [{ ttl: 60_000, limit: 100 }],
          storage: url
            ? new RedisThrottlerStorage(new IORedis(url, { maxRetriesPerRequest: null }))
            : undefined,
        };
      },
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    HealthModule,
    RealtimeModule,
    ActivityModule,
    MailModule,
    StorageModule,
    JobsModule,
    ApiKeysModule,
    WebhooksModule,
    NotificationsModule,
    AttachmentsModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    ReportsModule,
    ConfigFeatureModule,
    SearchModule,
    SharingModule,
    WorkLogsModule,
    SchedulerModule,
  ],
  providers: [
    // Global JWT auth — opt out per-route with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiting.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Uniform error responses + Sentry reporting.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
