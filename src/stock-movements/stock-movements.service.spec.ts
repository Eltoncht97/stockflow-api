import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MovementType } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { StockMovementsService } from './stock-movements.service.js';

const { jest } = import.meta;

const productId = 'ac78d2d3-7f6f-40ad-92ea-297a10e2f7b1';
const movement = {
  id: 'dc1a6bff-97ee-4497-ad99-b3f73484c49f',
  productId,
  type: MovementType.IN,
  quantity: 5,
  reason: 'Received',
  createdAt: new Date('2026-10-24T11:00:00.000Z'),
};

describe('StockMovementsService', () => {
  const transaction = {
    product: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    stockMovement: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };
  const service = new StockMovementsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.product.updateMany.mockResolvedValue({ count: 1 });
    transaction.stockMovement.create.mockResolvedValue(movement);
  });

  it('increments stock and creates an IN movement in one transaction', async () => {
    await expect(
      service.create({
        productId,
        type: MovementType.IN,
        quantity: 5,
        reason: 'Received',
      }),
    ).resolves.toEqual(movement);

    expect(transaction.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: productId,
        isActive: true,
        stock: { lte: 2_147_483_642 },
      },
      data: { stock: { increment: 5 } },
    });
    expect(transaction.stockMovement.create).toHaveBeenCalledWith({
      data: {
        productId,
        type: MovementType.IN,
        quantity: 5,
        reason: 'Received',
      },
    });
  });

  it('decrements stock for an OUT movement', async () => {
    transaction.stockMovement.create.mockResolvedValue({
      ...movement,
      type: MovementType.OUT,
    });

    await service.create({
      productId,
      type: MovementType.OUT,
      quantity: 3,
      reason: 'Dispatched',
    });

    expect(transaction.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: productId,
        isActive: true,
        stock: { gte: 3 },
      },
      data: { stock: { decrement: 3 } },
    });
  });

  it('rejects a nonexistent product', async () => {
    transaction.product.updateMany.mockResolvedValue({ count: 0 });
    transaction.product.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        productId,
        type: MovementType.IN,
        quantity: 1,
        reason: 'Received',
      }),
    ).rejects.toThrow(new NotFoundException('Product not found'));
  });

  it.each([MovementType.IN, MovementType.OUT])(
    'rejects an inactive product for %s',
    async (type) => {
      transaction.product.updateMany.mockResolvedValue({ count: 0 });
      transaction.product.findUnique.mockResolvedValue({ isActive: false });

      await expect(
        service.create({ productId, type, quantity: 1, reason: 'Received' }),
      ).rejects.toThrow(
        new ConflictException(
          'Inactive products cannot receive stock movements',
        ),
      );
    },
  );

  it('rejects insufficient stock', async () => {
    transaction.product.updateMany.mockResolvedValue({ count: 0 });
    transaction.product.findUnique.mockResolvedValue({ isActive: true });

    await expect(
      service.create({
        productId,
        type: MovementType.OUT,
        quantity: 6,
        reason: 'Dispatched',
      }),
    ).rejects.toThrow(new ConflictException('Insufficient stock'));
  });

  it('rejects stock overflow', async () => {
    transaction.product.updateMany.mockResolvedValue({ count: 0 });
    transaction.product.findUnique.mockResolvedValue({ isActive: true });

    await expect(
      service.create({
        productId,
        type: MovementType.IN,
        quantity: 1,
        reason: 'Received',
      }),
    ).rejects.toThrow(new ConflictException('Maximum stock exceeded'));
  });

  it('rejects a quantity above the PostgreSQL integer limit', async () => {
    transaction.product.findUnique.mockResolvedValue({ isActive: true });

    await expect(
      service.create({
        productId,
        type: MovementType.IN,
        quantity: 2_147_483_648,
        reason: 'Received',
      }),
    ).rejects.toThrow(new ConflictException('Maximum stock exceeded'));
    expect(transaction.product.updateMany).not.toHaveBeenCalled();
  });

  it('maps an unexpected movement creation failure to HTTP 500', async () => {
    transaction.stockMovement.create.mockRejectedValue(
      new Error('Insert failed'),
    );

    await expect(
      service.create({
        productId,
        type: MovementType.IN,
        quantity: 1,
        reason: 'Received',
      }),
    ).rejects.toThrow(
      new InternalServerErrorException('Unable to register stock movement'),
    );
  });
});
