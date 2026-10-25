import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

@Controller('error-test')
class ErrorTestController {
  @Get('expected')
  expected(): never {
    throw new BadRequestException('Invalid test request');
  }

  @Get('unexpected')
  unexpected(): never {
    throw new Error('Sensitive internal information');
  }
}

describe('Safe error handling (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ErrorTestController],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Optional: prevents the expected stack trace from cluttering test output.
    app.useLogger(false);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns useful information for expected HTTP exceptions', async () => {
    const response = await request(app.getHttpServer())
      .get('/error-test/expected')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      message: 'Invalid test request',
    });
  });

  it('does not expose internal information for unexpected errors', async () => {
    const response = await request(app.getHttpServer())
      .get('/error-test/unexpected')
      .expect(500);

    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });

    const serializedBody = JSON.stringify(response.body);

    expect(serializedBody).not.toContain('Sensitive internal information');
    expect(serializedBody).not.toContain('stack');
    expect(serializedBody).not.toContain('node_modules');
  });
});
