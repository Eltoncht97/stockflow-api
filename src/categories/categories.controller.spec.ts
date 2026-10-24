import type { CategoriesService } from './categories.service.js';
import { CategoriesController } from './categories.controller.js';

const { jest } = import.meta;

describe('CategoriesController', () => {
  const categoriesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new CategoriesController(
    categoriesService as unknown as CategoriesService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('delegates category operations to the service', async () => {
    const category = { id: 'category-id', name: 'Hardware' };
    categoriesService.findAll.mockResolvedValue([category]);
    categoriesService.findOne.mockResolvedValue(category);
    categoriesService.create.mockResolvedValue(category);
    categoriesService.update.mockResolvedValue(category);
    categoriesService.remove.mockResolvedValue(undefined);

    await expect(controller.findAll()).resolves.toEqual([category]);
    await expect(controller.findOne('category-id')).resolves.toEqual(category);
    await expect(controller.create({ name: 'Hardware' })).resolves.toEqual(
      category,
    );
    await expect(
      controller.update('category-id', { name: 'Hardware' }),
    ).resolves.toEqual(category);
    await expect(controller.remove('category-id')).resolves.toBeUndefined();
  });
});
