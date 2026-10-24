import { BadRequestException } from '@nestjs/common';
import type { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';

const { jest } = import.meta;

describe('ProductsController', () => {
  const productsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findStockMovements: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
  };
  const controller = new ProductsController(
    productsService as unknown as ProductsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates product operations to the service', async () => {
    const product = { id: 'product-id', price: '10.00' };
    productsService.findAll.mockResolvedValue([product]);
    productsService.findOne.mockResolvedValue(product);
    productsService.findStockMovements.mockResolvedValue([]);
    productsService.create.mockResolvedValue(product);
    productsService.update.mockResolvedValue(product);

    await expect(controller.findAll()).resolves.toEqual([product]);
    await expect(controller.findOne('product-id')).resolves.toEqual(product);
    await expect(controller.findStockMovements('product-id')).resolves.toEqual(
      [],
    );
    await expect(
      controller.create({
        sku: 'SKU-001',
        name: 'Keyboard',
        categoryId: '77bbef2d-f0c9-456d-a478-dbc523ff0876',
        price: '10.00',
      }),
    ).resolves.toEqual(product);
    await expect(
      controller.update('product-id', { name: 'Updated' }),
    ).resolves.toEqual(product);
  });

  it.each([
    ['activate', undefined],
    ['activate', null],
    ['activate', {}],
    ['deactivate', {}],
  ] as const)('allows an empty body for %s', async (method, body) => {
    productsService[method].mockResolvedValue({ id: 'product-id' });

    await expect(controller[method]('product-id', body)).resolves.toEqual({
      id: 'product-id',
    });
  });

  it.each([
    ['activate', { isActive: true }],
    ['deactivate', []],
    ['deactivate', 'invalid'],
  ] as const)('rejects a body for %s', (method, body) => {
    expect(() => controller[method]('product-id', body)).toThrow(
      new BadRequestException('Request body is not allowed'),
    );
    expect(productsService[method]).not.toHaveBeenCalled();
  });
});
