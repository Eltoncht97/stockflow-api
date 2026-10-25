import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { setupApplication } from '../src/app.setup.js';

@Controller('helmet-test')
class HelmetTestController {
  @Get()
  getResponse(): { status: string } {
    return { status: 'ok' };
  }
}

describe('Helmet (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HelmetTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('adds security headers without exposing the framework', async () => {
    const response = await request(app.getHttpServer())
      .get('/helmet-test')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['referrer-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
