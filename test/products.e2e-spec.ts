import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { resetTestDatabase } from './helpers/test-database.js';

interface ProductResponseBody {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  categoryId: string;
}

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let categoryId: string;

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
    const category = await prisma.category.create({
      data: { name: 'Hardware' },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await resetTestDatabase(prisma);
    await app.close();
  });

  const createProduct = async (
    overrides: Record<string, unknown> = {},
  ): Promise<ProductResponseBody> => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .send({
        categoryId,
        sku: `SKU-${randomUUID()}`,
        name: 'Keyboard',
        price: '49.90',
        ...overrides,
      })
      .expect(201);

    return response.body as ProductResponseBody;
  };

  it('creates a normalized product with database defaults', async () => {
    const product = await createProduct({
      sku: '  SKU-001  ',
      name: '  Keyboard  ',
      price: '  49.9  ',
    });

    expect(product).toMatchObject({
      sku: 'SKU-001',
      name: 'Keyboard',
      price: '49.90',
      stock: 0,
      minStock: 0,
      isActive: true,
      categoryId,
    });
    await expect(
      prisma.product.findUnique({ where: { id: product.id } }),
    ).resolves.toMatchObject({ stock: 0, minStock: 0, isActive: true });
  });

  it('supports optional fields and exact decimal precision', async () => {
    const product = await createProduct({
      description: '  Mechanical keyboard  ',
      minStock: 4,
      price: '9999999999.99',
    });

    expect(product).toMatchObject({
      description: 'Mechanical keyboard',
      minStock: 4,
      price: '9999999999.99',
    });
  });

  it('returns products ordered by name and returns one product', async () => {
    const keyboard = await createProduct({ name: 'Keyboard' });
    await createProduct({ name: 'Adapter' });

    const listResponse = await request(app.getHttpServer())
      .get('/products')
      .expect(200);
    const list = listResponse.body as ProductResponseBody[];
    expect(list.map(({ name }) => name)).toEqual(['Adapter', 'Keyboard']);

    const getResponse = await request(app.getHttpServer())
      .get(`/products/${keyboard.id}`)
      .expect(200);
    expect(getResponse.body).toEqual(
      expect.objectContaining({ id: keyboard.id, price: '49.90' }),
    );
  });

  it('enforces case-insensitive SKU uniqueness during concurrent requests', async () => {
    const sku = `RACE-${randomUUID()}`;
    const payload = { categoryId, name: 'Keyboard', price: '49.90' };
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/products')
        .send({ ...payload, sku }),
      request(app.getHttpServer())
        .post('/products')
        .send({ ...payload, sku: `  ${sku.toLowerCase()}  ` }),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    await expect(prisma.product.count()).resolves.toBe(1);
  });

  it.each(['-1', '1.999', '10000000000.00'])(
    'rejects invalid price %s',
    async (price) => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ categoryId, sku: 'SKU-001', name: 'Keyboard', price })
        .expect(400);
      await expect(prisma.product.count()).resolves.toBe(0);
    },
  );

  it.each([
    [{ stock: 10 }, 'stock'],
    [{ isActive: false }, 'isActive'],
    [{ unknown: true }, 'unknown'],
  ])('rejects direct or unknown field %s (%s)', async (field, fieldName) => {
    expect(fieldName).toBeTruthy();
    await request(app.getHttpServer())
      .post('/products')
      .send({
        categoryId,
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
        ...field,
      })
      .expect(400);
  });

  it('returns 404 for an invalid category reference', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({
        categoryId: randomUUID(),
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
      })
      .expect(404);
  });

  it('updates fields and clears an optional description', async () => {
    const product = await createProduct({ description: 'Original' });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/products/${product.id}`)
      .send({
        sku: '  SKU-UPDATED  ',
        name: 'Updated keyboard',
        description: null,
        price: '55.00',
        minStock: 3,
      })
      .expect(200);
    expect(updateResponse.body).toEqual(
      expect.objectContaining({
        sku: 'SKU-UPDATED',
        description: null,
        price: '55.00',
        minStock: 3,
      }),
    );
  });

  it('rejects empty updates and direct stock changes', async () => {
    const product = await createProduct();

    await request(app.getHttpServer())
      .patch(`/products/${product.id}`)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/products/${product.id}`)
      .send({ stock: 10 })
      .expect(400);
  });

  it('deactivates and activates a product idempotently', async () => {
    const product = await createProduct();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request(app.getHttpServer())
        .patch(`/products/${product.id}/deactivate`)
        .send({})
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({ isActive: false }),
      );
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request(app.getHttpServer())
        .patch(`/products/${product.id}/activate`)
        .send({})
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({ isActive: true }),
      );
    }
  });

  it('rejects bodies on activation endpoints', async () => {
    const product = await createProduct();

    await request(app.getHttpServer())
      .patch(`/products/${product.id}/deactivate`)
      .send({ isActive: false })
      .expect(400);
  });

  it.each([
    { operation: 'get', suffix: '' },
    { operation: 'patch', suffix: '' },
    { operation: 'activate', suffix: '/activate' },
    { operation: 'deactivate', suffix: '/deactivate' },
  ] as const)(
    'returns 404 for missing product operation %s',
    async ({ operation, suffix }) => {
      const path = `/products/${randomUUID()}${suffix}`;
      const response =
        operation === 'get'
          ? request(app.getHttpServer()).get(path)
          : request(app.getHttpServer())
              .patch(path)
              .send(operation === 'patch' ? { name: 'Updated' } : {});

      await response.expect(404);
    },
  );
});
