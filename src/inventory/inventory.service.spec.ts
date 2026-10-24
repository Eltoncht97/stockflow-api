import type { PrismaService } from '../prisma/prisma.service.js';
import { InventoryService } from './inventory.service.js';
import { InventoryStatus } from './inventory-status.enum.js';

const { jest } = import.meta;

const inventoryRow = {
  productId: 'ac78d2d3-7f6f-40ad-92ea-297a10e2f7b1',
  sku: 'SKU-001',
  name: 'Keyboard',
  categoryId: '77bbef2d-f0c9-456d-a478-dbc523ff0876',
  categoryName: 'Hardware',
  stock: 3,
  minStock: 5,
  status: InventoryStatus.LOW_STOCK,
};

describe('InventoryService', () => {
  const queryRaw = jest.fn<Promise<unknown[]>, [unknown]>();
  const prisma = { $queryRaw: queryRaw };
  const service = new InventoryService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns inventory items with nested category data', async () => {
    prisma.$queryRaw.mockResolvedValue([inventoryRow]);

    await expect(service.findAll({})).resolves.toEqual([
      {
        productId: inventoryRow.productId,
        sku: 'SKU-001',
        name: 'Keyboard',
        category: {
          id: inventoryRow.categoryId,
          name: 'Hardware',
        },
        stock: 3,
        minStock: 5,
        status: InventoryStatus.LOW_STOCK,
      },
    ]);
  });

  it('builds category, search, and status filters', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await service.findAll({
      categoryId: inventoryRow.categoryId,
      search: 'key',
      status: InventoryStatus.LOW_STOCK,
    });

    const query = queryRaw.mock.calls[0][0] as {
      strings: string[];
      values: unknown[];
    };
    const sql = query.strings.join(' ');

    expect(sql).toContain('p.category_id = CAST(');
    expect(sql).toContain('STRPOS(LOWER(p.sku)');
    expect(sql).toContain('WHERE status =');
    expect(query.values).toEqual(
      expect.arrayContaining([
        inventoryRow.categoryId,
        'key',
        InventoryStatus.LOW_STOCK,
      ]),
    );
  });

  it('returns low-stock and out-of-stock items', async () => {
    prisma.$queryRaw.mockResolvedValue([inventoryRow]);

    await expect(service.findLowStock()).resolves.toHaveLength(1);

    const query = queryRaw.mock.calls[0][0] as {
      strings: string[];
    };
    expect(query.strings.join(' ')).toContain('WHERE status IN');
  });

  it('converts summary bigint values to numbers', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        totalProducts: 4n,
        totalUnits: 12n,
        inStockProducts: 2n,
        lowStockProducts: 1n,
        outOfStockProducts: 1n,
      },
    ]);

    await expect(service.getSummary()).resolves.toEqual({
      totalProducts: 4,
      totalUnits: 12,
      inStockProducts: 2,
      lowStockProducts: 1,
      outOfStockProducts: 1,
    });
  });

  it('returns zero values for an empty inventory', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        totalProducts: 0n,
        totalUnits: 0n,
        inStockProducts: 0n,
        lowStockProducts: 0n,
        outOfStockProducts: 0n,
      },
    ]);

    await expect(service.getSummary()).resolves.toEqual({
      totalProducts: 0,
      totalUnits: 0,
      inStockProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    });
  });
});
