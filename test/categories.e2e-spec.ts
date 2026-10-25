import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { resetTestDatabase } from './helpers/test-database.js';

interface CategoryResponseBody {
  id: string;
  name: string;
  description: string | null;
}

describe('CategoriesController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetTestDatabase(prisma);
  });

  afterAll(async () => {
    await resetTestDatabase(prisma);
    await app.close();
  });

  it('creates and persists a normalized category', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .send({ name: '  Hardware  ', description: '  Physical products  ' })
      .expect(201);
    const body = response.body as CategoryResponseBody;

    expect(body).toMatchObject({
      name: 'Hardware',
      description: 'Physical products',
    });
    await expect(
      prisma.category.findUnique({ where: { id: body.id } }),
    ).resolves.toMatchObject({ name: 'Hardware' });
  });

  it('returns categories ordered by name', async () => {
    await prisma.category.createMany({
      data: [{ name: 'Tools' }, { name: 'Accessories' }],
    });

    const response = await request(app.getHttpServer())
      .get('/categories')
      .expect(200);
    const body = response.body as CategoryResponseBody[];

    expect(body.map(({ name }) => name)).toEqual(['Accessories', 'Tools']);
  });

  it('returns and updates a category, including clearing its description', async () => {
    const category = await prisma.category.create({
      data: { name: 'Hardware', description: 'Physical products' },
    });

    const getResponse = await request(app.getHttpServer())
      .get(`/categories/${category.id}`)
      .expect(200);
    expect(getResponse.body).toEqual(
      expect.objectContaining({ name: 'Hardware' }),
    );

    const updateResponse = await request(app.getHttpServer())
      .patch(`/categories/${category.id}`)
      .send({ name: '  Equipment  ', description: null })
      .expect(200);
    expect(updateResponse.body).toEqual(
      expect.objectContaining({ name: 'Equipment', description: null }),
    );
  });

  it('rejects an empty update', async () => {
    const category = await prisma.category.create({
      data: { name: 'Hardware' },
    });

    await request(app.getHttpServer())
      .patch(`/categories/${category.id}`)
      .send({})
      .expect(400);
  });

  it('enforces case-insensitive uniqueness during concurrent requests', async () => {
    const name = `Concurrent ${randomUUID()}`;
    const responses = await Promise.all([
      request(app.getHttpServer()).post('/categories').send({ name }),
      request(app.getHttpServer())
        .post('/categories')
        .send({ name: `  ${name.toUpperCase()}  ` }),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    await expect(prisma.category.count()).resolves.toBe(1);
  });

  it('rejects invalid and unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/categories')
      .send({ name: '   ', unknown: true })
      .expect(400);
  });

  it('prevents deletion while a product references the category', async () => {
    const category = await prisma.category.create({
      data: { name: 'Hardware' },
    });
    await prisma.product.create({
      data: {
        categoryId: category.id,
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
      },
    });

    await request(app.getHttpServer())
      .delete(`/categories/${category.id}`)
      .expect(409);
    await expect(
      prisma.category.findUnique({ where: { id: category.id } }),
    ).resolves.not.toBeNull();
  });

  it('deletes an unused category', async () => {
    const category = await prisma.category.create({
      data: { name: 'Hardware' },
    });

    await request(app.getHttpServer())
      .delete(`/categories/${category.id}`)
      .expect(204);
    await expect(
      prisma.category.findUnique({ where: { id: category.id } }),
    ).resolves.toBeNull();
  });

  it.each(['get', 'patch', 'delete'] as const)(
    'returns 404 for %s on a missing category',
    async (method) => {
      const categoryPath = `/categories/${randomUUID()}`;
      const operation =
        method === 'get'
          ? request(app.getHttpServer()).get(categoryPath)
          : method === 'patch'
            ? request(app.getHttpServer())
                .patch(categoryPath)
                .send({ name: 'Updated' })
            : request(app.getHttpServer()).delete(categoryPath);

      await operation.expect(404);
    },
  );
});
