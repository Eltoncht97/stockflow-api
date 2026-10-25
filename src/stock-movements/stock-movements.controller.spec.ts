import { MovementType } from '../generated/prisma/client.js';
import type { StockMovementsService } from './stock-movements.service.js';
import { StockMovementsController } from './stock-movements.controller.js';

const { jest } = import.meta;

describe('StockMovementsController', () => {
  const stockMovementsService = { create: jest.fn() };
  const controller = new StockMovementsController(
    stockMovementsService as unknown as StockMovementsService,
  );

  it('delegates movement creation to the service', async () => {
    const dto = {
      productId: 'ac78d2d3-7f6f-40ad-92ea-297a10e2f7b1',
      type: MovementType.IN,
      quantity: 2,
      reason: 'Received',
    };
    const movement = {
      id: 'dc1a6bff-97ee-4497-ad99-b3f73484c49f',
      ...dto,
      createdAt: new Date('2026-10-24T11:00:00.000Z'),
    };
    stockMovementsService.create.mockResolvedValue(movement);

    await expect(controller.create(dto)).resolves.toEqual(movement);
    expect(stockMovementsService.create).toHaveBeenCalledWith(dto);
  });
});
