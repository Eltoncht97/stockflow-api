import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { setupApp } from '../src/app.setup.js';

@Controller('cors-test')
class CorsTestController {
  @Get()
  test(): { ok: boolean } {
    return { ok: true };
  }
}

describe('CORS (e2e)', () => {
  let app: INestApplication<App>;

  const allowedOrigin = 'http://localhost:3001';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CorsTestController],
    }).compile();

    app = moduleFixture.createNestApplication();

    setupApp(app, {
      corsOrigins: [allowedOrigin],
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows requests from an allowed origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/cors-test')
      .set('Origin', allowedOrigin)
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('does not allow requests from a non-allowed origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/cors-test')
      .set('Origin', 'http://evil-example.com')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('handles preflight requests from an allowed origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/cors-test')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);

    expect(response.headers['access-control-allow-methods']).toBeDefined();

    expect(response.headers['access-control-allow-headers']).toContain(
      'Content-Type',
    );
  });

  it('does not enable credentialed CORS requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/cors-test')
      .set('Origin', allowedOrigin)
      .expect(200);

    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
  });
});
