import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CategoriesService } from './categories.service.js';

const { jest } = import.meta;

const category = {
  id: '798a6f3e-692b-4d0f-84b6-cf4e19b1d2e2',
  name: 'Hardware',
  description: 'Physical products',
  createdAt: new Date('2026-10-24T10:00:00.000Z'),
  updatedAt: new Date('2026-10-24T10:00:00.000Z'),
};

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Database error', {
    code,
    clientVersion: '7.10.0',
  });

describe('CategoriesService', () => {
  const prisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new CategoriesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns categories ordered by name', async () => {
    prisma.category.findMany.mockResolvedValue([category]);

    await expect(service.findAll()).resolves.toEqual([category]);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });

  it('returns one category', async () => {
    prisma.category.findUnique.mockResolvedValue(category);

    await expect(service.findOne(category.id)).resolves.toEqual(category);
  });

  it('throws when a category does not exist', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(service.findOne(category.id)).rejects.toThrow(
      new NotFoundException('Category not found'),
    );
  });

  it('creates a category', async () => {
    prisma.category.create.mockResolvedValue(category);

    await expect(
      service.create({ name: 'Hardware', description: 'Physical products' }),
    ).resolves.toEqual(category);
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Hardware', description: 'Physical products' },
    });
  });

  it('maps duplicate category errors to conflict', async () => {
    prisma.category.create.mockRejectedValue(prismaError('P2002'));

    await expect(service.create({ name: 'Hardware' })).rejects.toThrow(
      new ConflictException('A category with this name already exists'),
    );
  });

  it('updates a category and can clear its description', async () => {
    prisma.category.update.mockResolvedValue({
      ...category,
      description: null,
    });

    await expect(
      service.update(category.id, { description: null }),
    ).resolves.toMatchObject({ description: null });
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: category.id },
      data: { description: null },
    });
  });

  it.each([
    ['P2002', ConflictException, 'A category with this name already exists'],
    ['P2025', NotFoundException, 'Category not found'],
  ])('maps update error %s', async (code, exception, message) => {
    prisma.category.update.mockRejectedValue(prismaError(code));

    await expect(
      service.update(category.id, { name: 'Tools' }),
    ).rejects.toThrow(new exception(message));
  });

  it('deletes a category', async () => {
    prisma.category.delete.mockResolvedValue(category);

    await expect(service.remove(category.id)).resolves.toBeUndefined();
  });

  it.each([
    [
      'P2003',
      ConflictException,
      'Category cannot be deleted because it has associated products',
    ],
    ['P2025', NotFoundException, 'Category not found'],
  ])('maps delete error %s', async (code, exception, message) => {
    prisma.category.delete.mockRejectedValue(prismaError(code));

    await expect(service.remove(category.id)).rejects.toThrow(
      new exception(message),
    );
  });

  it('does not hide unexpected database errors', async () => {
    const error = new Error('Connection lost');
    prisma.category.create.mockRejectedValue(error);

    await expect(service.create({ name: 'Hardware' })).rejects.toBe(error);
  });
});
