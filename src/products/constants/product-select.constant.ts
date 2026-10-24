import type { Prisma } from '../../generated/prisma/client.js';

export const productSelect = {
  id: true,
  sku: true,
  name: true,
  description: true,
  price: true,
  stock: true,
  minStock: true,
  isActive: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;
