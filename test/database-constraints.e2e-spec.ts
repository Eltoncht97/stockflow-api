import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { resetTestDatabase } from './helpers/test-database.js';

describe('PostgreSQL constraints (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let categoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  it('has the expected functional unique indexes and check constraints', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'categories_name_case_insensitive_key',
          'products_sku_case_insensitive_key'
        )
      ORDER BY indexname
    `;
    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname
      FROM pg_constraint
      WHERE conname IN (
        'chk_products_price',
        'chk_products_stock',
        'chk_products_min_stock',
        'chk_stock_movements_quantity',
        'products_category_id_fkey',
        'stock_movements_product_id_fkey'
      )
      ORDER BY conname
    `;

    expect(indexes.map(({ indexname }) => indexname)).toEqual([
      'categories_name_case_insensitive_key',
      'products_sku_case_insensitive_key',
    ]);
    expect(constraints.map(({ conname }) => conname)).toEqual([
      'chk_products_min_stock',
      'chk_products_price',
      'chk_products_stock',
      'chk_stock_movements_quantity',
      'products_category_id_fkey',
      'stock_movements_product_id_fkey',
    ]);
  });

  it('enforces normalized category names and product SKUs in PostgreSQL', async () => {
    await expect(
      prisma.category.create({ data: { name: '  HARDWARE  ' } }),
    ).rejects.toBeDefined();

    await prisma.product.create({
      data: {
        categoryId,
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
      },
    });
    await expect(
      prisma.product.create({
        data: {
          categoryId,
          sku: '  sku-001  ',
          name: 'Duplicate keyboard',
          price: '49.90',
        },
      }),
    ).rejects.toBeDefined();
  });

  it('enforces non-negative product values', async () => {
    const baseProduct = {
      categoryId,
      name: 'Keyboard',
      price: '49.90',
    };

    await expect(
      prisma.product.create({
        data: { ...baseProduct, sku: 'NEG-PRICE', price: '-0.01' },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.product.create({
        data: { ...baseProduct, sku: 'NEG-STOCK', stock: -1 },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.product.create({
        data: { ...baseProduct, sku: 'NEG-MIN', minStock: -1 },
      }),
    ).rejects.toBeDefined();
  });

  it('enforces positive movement quantities', async () => {
    const product = await prisma.product.create({
      data: {
        categoryId,
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
      },
    });

    await expect(
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: 0,
          reason: 'Invalid movement',
        },
      }),
    ).rejects.toBeDefined();
  });

  it('enforces product and movement foreign keys', async () => {
    await expect(
      prisma.product.create({
        data: {
          categoryId: randomUUID(),
          sku: 'SKU-001',
          name: 'Keyboard',
          price: '49.90',
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.stockMovement.create({
        data: {
          productId: randomUUID(),
          type: 'IN',
          quantity: 1,
          reason: 'Invalid product',
        },
      }),
    ).rejects.toBeDefined();
  });
});
