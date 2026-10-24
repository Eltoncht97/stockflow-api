import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

interface InventoryItemResponseBody {
  productId: string;
  sku: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
  stock: number;
  minStock: number;
  status: InventoryStatus;
}

interface InventorySummaryResponseBody {
  totalProducts: number;
  totalUnits: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

describe('InventoryController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let categoryId: string;
  let baselineSummary: InventorySummaryResponseBody;
  const productIds: string[] = [];
  const sameNameProductIds: string[] = [];
  const testPrefix = `Inventory ${randomUUID()}`;
  const skuPrefix = `INV-${randomUUID()}`;

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

    const baselineResponse = await request(app.getHttpServer())
      .get('/inventory/summary')
      .expect(200);
    baselineSummary = baselineResponse.body as InventorySummaryResponseBody;

    const category = await prisma.category.create({
      data: { name: `Category ${randomUUID()}` },
    });
    categoryId = category.id;

    const products = await Promise.all([
      prisma.product.create({
        data: {
          categoryId,
          sku: `${skuPrefix}-OUT`,
          name: `${testPrefix} Alpha`,
          price: '10.00',
          stock: 0,
          minStock: 0,
        },
      }),
      prisma.product.create({
        data: {
          categoryId,
          sku: `${skuPrefix}-LOW`,
          name: `${testPrefix} Beta`,
          price: '10.00',
          stock: 3,
          minStock: 5,
        },
      }),
      prisma.product.create({
        data: {
          categoryId,
          sku: `${skuPrefix}-IN`,
          name: `${testPrefix} Delta`,
          price: '10.00',
          stock: 6,
          minStock: 5,
        },
      }),
      prisma.product.create({
        data: {
          categoryId,
          sku: `${skuPrefix}-BOUNDARY`,
          name: `${testPrefix} Gamma`,
          price: '10.00',
          stock: 5,
          minStock: 5,
        },
      }),
      prisma.product.create({
        data: {
          categoryId,
          sku: `${skuPrefix}-TIE-A`,
          name: `${testPrefix} Epsilon`,
          price: '10.00',
          stock: 1,
          minStock: 0,
        },
      }),
      prisma.product.create({
        data: {
          categoryId,
          sku: `${skuPrefix}-TIE-B`,
          name: `${testPrefix} Epsilon`,
          price: '10.00',
          stock: 1,
          minStock: 0,
        },
      }),
      prisma.product.create({
        data: {
          categoryId,
          sku: `${skuPrefix}-INACTIVE`,
          name: `${testPrefix} Inactive`,
          price: '10.00',
          stock: 0,
          minStock: 5,
          isActive: false,
        },
      }),
    ]);

    productIds.push(...products.map(({ id }) => id));
    sameNameProductIds.push(products[4].id, products[5].id);
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  });

  it('returns active inventory with consistent statuses and stable ordering', async () => {
    const response = await request(app.getHttpServer())
      .get('/inventory')
      .query({ categoryId })
      .expect(200);
    const body = response.body as InventoryItemResponseBody[];

    expect(body.map(({ name }) => name)).toEqual([
      `${testPrefix} Alpha`,
      `${testPrefix} Beta`,
      `${testPrefix} Delta`,
      `${testPrefix} Epsilon`,
      `${testPrefix} Epsilon`,
      `${testPrefix} Gamma`,
    ]);
    expect(body.map(({ status }) => status)).toEqual([
      'OUT_OF_STOCK',
      'LOW_STOCK',
      'IN_STOCK',
      'IN_STOCK',
      'IN_STOCK',
      'LOW_STOCK',
    ]);
    expect(
      body
        .filter(({ name }) => name === `${testPrefix} Epsilon`)
        .map(({ productId }) => productId),
    ).toEqual([...sameNameProductIds].sort());
    expect(body.every((item) => item.category.id === categoryId)).toBe(true);
    expect(body.some(({ name }) => name.endsWith('Inactive'))).toBe(false);
  });

  it('combines category, status, and case-insensitive name filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/inventory')
      .query({
        categoryId,
        status: 'LOW_STOCK',
        search: `  ${testPrefix.toUpperCase()} beta  `,
      })
      .expect(200);
    const body = response.body as InventoryItemResponseBody[];

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      sku: `${skuPrefix}-LOW`,
      name: `${testPrefix} Beta`,
      status: 'LOW_STOCK',
    });
  });

  it('searches SKU using a case-insensitive partial match', async () => {
    const response = await request(app.getHttpServer())
      .get('/inventory')
      .query({ categoryId, search: `${skuPrefix.toLowerCase()}-in` })
      .expect(200);
    const body = response.body as InventoryItemResponseBody[];

    expect(body).toHaveLength(1);
    expect(body[0]?.sku).toBe(`${skuPrefix}-IN`);
  });

  it.each([
    [{ categoryId: 'not-a-uuid' }, 'invalid category UUID'],
    [{ status: 'UNKNOWN' }, 'unknown status'],
    [{ search: '   ' }, 'blank search'],
    [{ search: 'a'.repeat(101) }, 'search longer than 100 characters'],
    [{ unknown: 'value' }, 'unknown query parameter'],
  ])('returns 400 for %s (%s)', async (query) => {
    await request(app.getHttpServer())
      .get('/inventory')
      .query(query)
      .expect(400);
  });

  it('returns out-of-stock products before low-stock products', async () => {
    const response = await request(app.getHttpServer())
      .get('/inventory/low-stock')
      .expect(200);
    const body = response.body as InventoryItemResponseBody[];
    const testProducts = body.filter(({ productId }) =>
      productIds.includes(productId),
    );

    expect(testProducts.map(({ name }) => name)).toEqual([
      `${testPrefix} Alpha`,
      `${testPrefix} Beta`,
      `${testPrefix} Gamma`,
    ]);
    expect(testProducts.map(({ status }) => status)).toEqual([
      'OUT_OF_STOCK',
      'LOW_STOCK',
      'LOW_STOCK',
    ]);
  });

  it('calculates the active inventory summary in one consistent result', async () => {
    const response = await request(app.getHttpServer())
      .get('/inventory/summary')
      .expect(200);
    const body = response.body as InventorySummaryResponseBody;

    expect(body).toEqual({
      totalProducts: baselineSummary.totalProducts + 6,
      totalUnits: baselineSummary.totalUnits + 16,
      inStockProducts: baselineSummary.inStockProducts + 3,
      lowStockProducts: baselineSummary.lowStockProducts + 2,
      outOfStockProducts: baselineSummary.outOfStockProducts + 1,
    });
    expect(
      body.inStockProducts + body.lowStockProducts + body.outOfStockProducts,
    ).toBe(body.totalProducts);
  });
});
