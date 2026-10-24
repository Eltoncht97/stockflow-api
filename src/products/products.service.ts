import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaError } from '../common/helpers/is-prisma-error.helper.js';
import type { StockMovement } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { productSelect } from './constants/product-select.constant.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import type {
  ProductRecord,
  ProductResponse,
} from './types/product-response.type.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ProductResponse[]> {
    const products = await this.prisma.product.findMany({
      select: productSelect,
      orderBy: {
        name: 'asc',
      },
    });

    return products.map((product) => this.toResponse(product));
  }

  async findOne(id: string): Promise<ProductResponse> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: productSelect,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.toResponse(product);
  }

  async findStockMovements(id: string): Promise<StockMovement[]> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        stockMovements: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product.stockMovements;
  }

  async create(createProductDto: CreateProductDto): Promise<ProductResponse> {
    await this.ensureCategoryExists(createProductDto.categoryId);

    try {
      const product = await this.prisma.product.create({
        data: {
          sku: createProductDto.sku,
          name: createProductDto.name,
          categoryId: createProductDto.categoryId,
          price: createProductDto.price,
          ...(createProductDto.description !== undefined && {
            description: createProductDto.description,
          }),
          ...(createProductDto.minStock !== undefined && {
            minStock: createProductDto.minStock,
          }),
        },
        select: productSelect,
      });

      return this.toResponse(product);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponse> {
    const hasAtLeastOneField = Object.values(updateProductDto).some(
      (value) => value !== undefined,
    );

    if (!hasAtLeastOneField) {
      throw new BadRequestException('At least one field must be provided');
    }

    if (updateProductDto.categoryId !== undefined) {
      await this.ensureCategoryExists(updateProductDto.categoryId);
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(updateProductDto.sku !== undefined && {
            sku: updateProductDto.sku,
          }),
          ...(updateProductDto.name !== undefined && {
            name: updateProductDto.name,
          }),
          ...(updateProductDto.description !== undefined && {
            description: updateProductDto.description,
          }),
          ...(updateProductDto.categoryId !== undefined && {
            categoryId: updateProductDto.categoryId,
          }),
          ...(updateProductDto.price !== undefined && {
            price: updateProductDto.price,
          }),
          ...(updateProductDto.minStock !== undefined && {
            minStock: updateProductDto.minStock,
          }),
        },
        select: productSelect,
      });

      return this.toResponse(product);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  deactivate(id: string): Promise<ProductResponse> {
    return this.setActiveStatus(id, false);
  }

  activate(id: string): Promise<ProductResponse> {
    return this.setActiveStatus(id, true);
  }

  private async setActiveStatus(
    id: string,
    isActive: boolean,
  ): Promise<ProductResponse> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: { isActive },
        select: productSelect,
      });

      return this.toResponse(product);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private handlePrismaError(error: unknown): never {
    if (isPrismaError(error, 'P2002')) {
      throw new ConflictException('A product with this SKU already exists');
    }

    if (isPrismaError(error, 'P2003')) {
      throw new NotFoundException('Category not found');
    }

    if (isPrismaError(error, 'P2025')) {
      throw new NotFoundException('Product not found');
    }

    throw error;
  }

  private toResponse(product: ProductRecord): ProductResponse {
    return {
      ...product,
      price: product.price.toFixed(2),
    };
  }
}
