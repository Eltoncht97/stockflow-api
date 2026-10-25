import { Controller, Get, INestApplication, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service.js';

@Controller('rate-limit-test')
class RateLimitTestController {
  @Get('first')
  first(): { endpoint: string } {
    return { endpoint: 'first' };
  }

  @Get('second')
  second(): { endpoint: string } {
    return { endpoint: 'second' };
  }
}

describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;
  let appModule: Type<unknown>;

  beforeAll(async () => {
    process.env.THROTTLE_TTL = '60000';
    process.env.THROTTLE_LIMIT = '2';
    ({ AppModule: appModule } = await import('../src/app.module.js'));
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [appModule],
      controllers: [RateLimitTestController],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows requests within the configured limit', async () => {
    await request(app.getHttpServer())
      .get('/rate-limit-test/first')
      .expect(200);
    await request(app.getHttpServer())
      .get('/rate-limit-test/first')
      .expect(200);
  });

  it('returns 429 when requests exceed the configured limit', async () => {
    await request(app.getHttpServer())
      .get('/rate-limit-test/first')
      .expect(200);
    await request(app.getHttpServer())
      .get('/rate-limit-test/first')
      .expect(200);
    await request(app.getHttpServer())
      .get('/rate-limit-test/first')
      .expect(429);
  });

  it('shares the limit across endpoints for the same client IP', async () => {
    await request(app.getHttpServer())
      .get('/rate-limit-test/first')
      .expect(200);
    await request(app.getHttpServer())
      .get('/rate-limit-test/second')
      .expect(200);
    await request(app.getHttpServer())
      .get('/rate-limit-test/first')
      .expect(429);
  });
});
