import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { resetTestDatabase } from './helpers/test-database.js';

const POSTGRES_INT_MAX = 2_147_483_647;

interface StockMovementResponseBody {
  id: string;
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  createdAt: string;
}

describe('StockMovementsController (e2e)', () => {
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

  const createProduct = async (
    stock = 0,
    isActive = true,
  ): Promise<{ id: string }> => {
    const category = await prisma.category.create({
      data: {
        name: `Category ${randomUUID()}`,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        sku: `SKU-${randomUUID()}`,
        name: 'Test product',
        price: '10.00',
        stock,
        isActive,
      },
      select: { id: true },
    });
    return product;
  };

  it('registers an IN movement and increases stock', async () => {
    const product = await createProduct(5);

    const response = await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        productId: product.id,
        type: 'IN',
        quantity: 10,
        reason: '  Initial inventory  ',
      })
      .expect(201);

    const body = response.body as StockMovementResponseBody;

    expect(body).toEqual({
      id: body.id,
      productId: product.id,
      type: 'IN',
      quantity: 10,
      reason: 'Initial inventory',
      createdAt: body.createdAt,
    });
    expect(typeof body.id).toBe('string');
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    expect(updatedProduct.stock).toBe(15);
  });

  it('registers an OUT movement and decreases stock', async () => {
    const product = await createProduct(10);

    const response = await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        productId: product.id,
        type: 'OUT',
        quantity: 3,
        reason: 'Damaged products',
      })
      .expect(201);

    const body = response.body as StockMovementResponseBody;

    expect(body).toEqual({
      id: body.id,
      productId: product.id,
      type: 'OUT',
      quantity: 3,
      reason: 'Damaged products',
      createdAt: body.createdAt,
    });
    expect(typeof body.id).toBe('string');
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    expect(updatedProduct.stock).toBe(7);
  });

  it('rejects invalid payloads and unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        productId: 'not-a-uuid',
        type: 'TRANSFER',
        quantity: 0,
        reason: '   ',
        unknown: true,
      })
      .expect(400);
  });

  it('returns 404 when the product does not exist', async () => {
    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        productId: randomUUID(),
        type: 'IN',
        quantity: 1,
        reason: 'Initial inventory',
      })
      .expect(404);
  });

  it.each(['IN', 'OUT'])(
    'rejects %s movements for inactive products',
    async (type) => {
      const product = await createProduct(10, false);

      await request(app.getHttpServer())
        .post('/stock-movements')
        .send({
          productId: product.id,
          type,
          quantity: 1,
          reason: 'Inactive product movement',
        })
        .expect(409);

      const movementCount = await prisma.stockMovement.count({
        where: { productId: product.id },
      });
      expect(movementCount).toBe(0);
    },
  );

  it('rejects insufficient stock without changing stock or history', async () => {
    const product = await createProduct(2);

    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        productId: product.id,
        type: 'OUT',
        quantity: 3,
        reason: 'Damaged products',
      })
      .expect(409);

    const unchangedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    const movementCount = await prisma.stockMovement.count({
      where: { productId: product.id },
    });

    expect(unchangedProduct.stock).toBe(2);
    expect(movementCount).toBe(0);
  });

  it('rejects maximum stock overflow without changing stock or history', async () => {
    const product = await createProduct(POSTGRES_INT_MAX);

    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        productId: product.id,
        type: 'IN',
        quantity: 1,
        reason: 'Stock replenishment',
      })
      .expect(409);

    const unchangedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    const movementCount = await prisma.stockMovement.count({
      where: { productId: product.id },
    });

    expect(unchangedProduct.stock).toBe(POSTGRES_INT_MAX);
    expect(movementCount).toBe(0);
  });

  it('rejects a quantity above the PostgreSQL Int limit', async () => {
    const product = await createProduct();

    await request(app.getHttpServer())
      .post('/stock-movements')
      .send({
        productId: product.id,
        type: 'IN',
        quantity: POSTGRES_INT_MAX + 1,
        reason: 'Stock replenishment',
      })
      .expect(409);

    const unchangedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    const movementCount = await prisma.stockMovement.count({
      where: { productId: product.id },
    });

    expect(unchangedProduct.stock).toBe(0);
    expect(movementCount).toBe(0);
  });

  it('allows only one of two concurrent OUT movements when stock is limited', async () => {
    const product = await createProduct(10);
    const movementPayload = {
      productId: product.id,
      type: 'OUT',
      quantity: 7,
      reason: 'Concurrent stock removal',
    };

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/stock-movements')
        .send(movementPayload),
      request(app.getHttpServer())
        .post('/stock-movements')
        .send(movementPayload),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stock: true },
    });
    const movementCount = await prisma.stockMovement.count({
      where: { productId: product.id },
    });

    expect(updatedProduct.stock).toBe(3);
    expect(movementCount).toBe(1);
  });

  it('rolls back the stock update when movement creation fails', async () => {
    const product = await createProduct(5);

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION reject_test_stock_movement()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.reason = 'FORCE_ROLLBACK' THEN
          RAISE EXCEPTION 'Forced test failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER reject_test_stock_movement_trigger
      BEFORE INSERT ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION reject_test_stock_movement();
    `);

    try {
      await request(app.getHttpServer())
        .post('/stock-movements')
        .send({
          productId: product.id,
          type: 'IN',
          quantity: 4,
          reason: 'FORCE_ROLLBACK',
        })
        .expect(500);

      const unchangedProduct = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
        select: { stock: true },
      });
      const movementCount = await prisma.stockMovement.count({
        where: { productId: product.id },
      });

      expect(unchangedProduct.stock).toBe(5);
      expect(movementCount).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS reject_test_stock_movement_trigger ON stock_movements;',
      );
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS reject_test_stock_movement();',
      );
    }
  });

  it('returns inactive product movements in stable descending order', async () => {
    const product = await createProduct(10, false);
    const [lowerId, higherId] = [randomUUID(), randomUUID()].sort();
    const olderId = randomUUID();
    const sharedCreatedAt = new Date('2026-10-24T19:00:00.000Z');

    await prisma.stockMovement.createMany({
      data: [
        {
          id: olderId,
          productId: product.id,
          type: 'IN',
          quantity: 10,
          reason: 'Older movement',
          createdAt: new Date('2026-10-23T19:00:00.000Z'),
        },
        {
          id: lowerId,
          productId: product.id,
          type: 'IN',
          quantity: 5,
          reason: 'Same time IN movement',
          createdAt: sharedCreatedAt,
        },
        {
          id: higherId,
          productId: product.id,
          type: 'OUT',
          quantity: 2,
          reason: 'Same time OUT movement',
          createdAt: sharedCreatedAt,
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get(`/products/${product.id}/stock-movements`)
      .expect(200);
    const body = response.body as StockMovementResponseBody[];

    expect(body.map(({ id }) => id)).toEqual([higherId, lowerId, olderId]);
    expect(body.map(({ type }) => type)).toEqual(['OUT', 'IN', 'IN']);
  });

  it('returns an empty movement history for a product without movements', async () => {
    const product = await createProduct();

    await request(app.getHttpServer())
      .get(`/products/${product.id}/stock-movements`)
      .expect(200)
      .expect([]);
  });

  it('returns 404 when the history product does not exist', async () => {
    await request(app.getHttpServer())
      .get(`/products/${randomUUID()}/stock-movements`)
      .expect(404);
  });

  it('returns 400 when the history product UUID is invalid', async () => {
    await request(app.getHttpServer())
      .get('/products/not-a-uuid/stock-movements')
      .expect(400);
  });
});
