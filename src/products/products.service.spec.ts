import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { productSelect } from './constants/product-select.constant.js';
import { ProductsService } from './products.service.js';

const { jest } = import.meta;

const categoryId = '77bbef2d-f0c9-456d-a478-dbc523ff0876';
const productId = 'ac78d2d3-7f6f-40ad-92ea-297a10e2f7b1';
const productRecord = {
  id: productId,
  sku: 'SKU-001',
  name: 'Keyboard',
  description: null,
  price: new Prisma.Decimal('49.9'),
  stock: 0,
  minStock: 0,
  isActive: true,
  categoryId,
  category: { id: categoryId, name: 'Hardware' },
  createdAt: new Date('2026-10-24T10:00:00.000Z'),
  updatedAt: new Date('2026-10-24T10:00:00.000Z'),
};

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Database error', {
    code,
    clientVersion: '7.10.0',
  });

describe('ProductsService', () => {
  const prisma = {
    category: { findUnique: jest.fn() },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new ProductsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns products ordered by name with fixed decimal prices', async () => {
    prisma.product.findMany.mockResolvedValue([productRecord]);

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({ id: productId, price: '49.90' }),
    ]);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      select: productSelect,
      orderBy: { name: 'asc' },
    });
  });

  it('returns one product', async () => {
    prisma.product.findUnique.mockResolvedValue(productRecord);

    await expect(service.findOne(productId)).resolves.toMatchObject({
      id: productId,
      price: '49.90',
    });
  });

  it('throws when a product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne(productId)).rejects.toThrow(
      new NotFoundException('Product not found'),
    );
  });

  it('creates a product and leaves database defaults unset', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: categoryId });
    prisma.product.create.mockResolvedValue(productRecord);

    await expect(
      service.create({
        categoryId,
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
      }),
    ).resolves.toMatchObject({ price: '49.90' });
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        categoryId,
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
      },
      select: productSelect,
    });
  });

  it('creates a product with all optional fields', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: categoryId });
    prisma.product.create.mockResolvedValue({
      ...productRecord,
      description: 'Mechanical keyboard',
      minStock: 3,
    });

    await service.create({
      categoryId,
      sku: 'SKU-001',
      name: 'Keyboard',
      description: 'Mechanical keyboard',
      price: '49.90',
      minStock: 3,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        categoryId,
        sku: 'SKU-001',
        name: 'Keyboard',
        description: 'Mechanical keyboard',
        price: '49.90',
        minStock: 3,
      },
      select: productSelect,
    });
  });

  it('rejects a missing category before creating a product', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        categoryId,
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
      }),
    ).rejects.toThrow(new NotFoundException('Category not found'));
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('rejects an empty update', async () => {
    await expect(service.update(productId, {})).rejects.toThrow(
      new BadRequestException('At least one field must be provided'),
    );
  });

  it('updates provided fields and clears a description', async () => {
    prisma.product.update.mockResolvedValue({
      ...productRecord,
      name: 'Updated keyboard',
      description: null,
    });

    await service.update(productId, {
      name: 'Updated keyboard',
      description: null,
    });

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: productId },
      data: { name: 'Updated keyboard', description: null },
      select: productSelect,
    });
  });

  it('checks a new category before updating it', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: categoryId });
    prisma.product.update.mockResolvedValue(productRecord);

    await service.update(productId, { categoryId });

    expect(prisma.category.findUnique).toHaveBeenCalledWith({
      where: { id: categoryId },
      select: { id: true },
    });
  });

  it.each([
    ['P2002', ConflictException, 'A product with this SKU already exists'],
    ['P2003', NotFoundException, 'Category not found'],
    ['P2025', NotFoundException, 'Product not found'],
  ])('maps Prisma error %s', async (code, exception, message) => {
    prisma.category.findUnique.mockResolvedValue({ id: categoryId });
    prisma.product.create.mockRejectedValue(prismaError(code));

    await expect(
      service.create({
        categoryId,
        sku: 'SKU-001',
        name: 'Keyboard',
        price: '49.90',
      }),
    ).rejects.toThrow(new exception(message));
  });

  it.each([
    ['deactivate', false],
    ['activate', true],
  ] as const)('%s sets the active status', async (method, isActive) => {
    prisma.product.update.mockResolvedValue({
      ...productRecord,
      isActive,
    });

    await expect(service[method](productId)).resolves.toMatchObject({
      isActive,
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: productId },
      data: { isActive },
      select: productSelect,
    });
  });

  it('returns movement history in stable descending order', async () => {
    const movement = {
      id: 'dc1a6bff-97ee-4497-ad99-b3f73484c49f',
      productId,
      type: 'IN',
      quantity: 2,
      reason: 'Received',
      createdAt: new Date('2026-10-24T11:00:00.000Z'),
    };
    prisma.product.findUnique.mockResolvedValue({ stockMovements: [movement] });

    await expect(service.findStockMovements(productId)).resolves.toEqual([
      movement,
    ]);
    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: productId },
      select: {
        stockMovements: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });
  });

  it('throws when the movement history product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.findStockMovements(productId)).rejects.toThrow(
      new NotFoundException('Product not found'),
    );
  });
});
