import type { Prisma } from '../../generated/prisma/client.js';
import { productSelect } from '../constants/product-select.constant.js';

export type ProductRecord = Prisma.ProductGetPayload<{
  select: typeof productSelect;
}>;

export type ProductResponse = Omit<ProductRecord, 'price'> & {
  price: string;
};
