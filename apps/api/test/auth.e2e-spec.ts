import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Real HTTP tests against a disposable Postgres. Set TEST_DATABASE_URL to run;
 * otherwise the suite is skipped (e.g. local machine without a test DB).
 * CI provisions a Postgres service and sets TEST_DATABASE_URL + DB_SYNCHRONIZE=true.
 */
const hasDb = !!process.env.TEST_DATABASE_URL;
const d = hasDb ? describe : describe.skip;

d('Auth & tenant isolation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.DB_SYNCHRONIZE = 'true';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const rnd = () => Math.random().toString(36).slice(2, 8);

  it('registers, logs in, and rejects bad credentials', async () => {
    const email = `e2e_${rnd()}@test.local`;
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'E2E', workspaceName: 'E2E WS' })
      .expect(201);
    expect(reg.body.accessToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong' })
      .expect(401);
  });

  it('blocks access to a workspace the user is not a member of', async () => {
    // User A creates a workspace.
    const a = (
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `a_${rnd()}@test.local`, password: 'password123', name: 'A', workspaceName: 'A WS' })
    ).body;
    const aWs = (
      await request(app.getHttpServer()).get('/api/workspaces').set('Authorization', `Bearer ${a.accessToken}`)
    ).body[0];

    // User B (different account) tries to read A's workspace projects.
    const b = (
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `b_${rnd()}@test.local`, password: 'password123', name: 'B', workspaceName: 'B WS' })
    ).body;

    await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .set('x-workspace-id', aWs.id)
      .expect(403); // tenant isolation enforced by WorkspaceGuard
  });

  it('requires authentication for protected routes', async () => {
    await request(app.getHttpServer()).get('/api/workspaces').expect(401);
  });
});
