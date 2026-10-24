import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { resetTestDatabase } from './helpers/test-database.js';

describe('StockFlow workflow (e2e)', () => {
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

  it('creates stock, dispatches it, and reports the final inventory', async () => {
    const categoryResponse = await request(app.getHttpServer())
      .post('/categories')
      .send({ name: 'Hardware' })
      .expect(201);
    const category = categoryResponse.body as { id: string };

    const productResponse = await request(app.getHttpServer())
      .post('/products')
      .send({
        categoryId: category.id,
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
        minStock: 5,
      })
      .expect(201);
    const product = productResponse.body as { id: string };

    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        productId: product.id,
        type: 'IN',
        quantity: 10,
        reason: 'Initial inventory',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        productId: product.id,
        type: 'OUT',
        quantity: 4,
        reason: 'Customer order',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/products/${product.id}/stock-movements`)
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ type: string }>;
        expect(body).toHaveLength(2);
        expect(body.map(({ type }) => type)).toEqual(['OUT', 'IN']);
      });
    const inventoryResponse = await request(app.getHttpServer())
      .get('/inventory')
      .expect(200);
    expect(inventoryResponse.body).toEqual([
      expect.objectContaining({
        productId: product.id,
        stock: 6,
        minStock: 5,
        status: 'IN_STOCK',
      }),
    ]);
    await request(app.getHttpServer())
      .get('/inventory/summary')
      .expect(200)
      .expect({
        totalProducts: 1,
        totalUnits: 6,
        inStockProducts: 1,
        lowStockProducts: 0,
        outOfStockProducts: 0,
      });

    await expect(
      prisma.product.findUniqueOrThrow({
        where: { id: product.id },
        select: { stock: true },
      }),
    ).resolves.toEqual({ stock: 6 });
    await expect(
      prisma.stockMovement.count({ where: { productId: product.id } }),
    ).resolves.toBe(2);
  });
});
