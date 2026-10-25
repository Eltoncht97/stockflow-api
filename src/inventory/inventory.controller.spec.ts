import type { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';

const { jest } = import.meta;

describe('InventoryController', () => {
  const inventoryService = {
    findAll: jest.fn(),
    findLowStock: jest.fn(),
    getSummary: jest.fn(),
  };
  const controller = new InventoryController(
    inventoryService as unknown as InventoryService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('delegates inventory reads to the service', async () => {
    inventoryService.findAll.mockResolvedValue([]);
    inventoryService.findLowStock.mockResolvedValue([]);
    inventoryService.getSummary.mockResolvedValue({
      totalProducts: 0,
      totalUnits: 0,
      inStockProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    });

    await expect(controller.findAll({ search: 'key' })).resolves.toEqual([]);
    expect(inventoryService.findAll).toHaveBeenCalledWith({ search: 'key' });
    await expect(controller.findLowStock()).resolves.toEqual([]);
    await expect(controller.getSummary()).resolves.toMatchObject({
      totalProducts: 0,
    });
  });
});
