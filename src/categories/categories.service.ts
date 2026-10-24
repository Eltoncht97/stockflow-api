import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Category } from '../generated/prisma/client.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      return await this.prisma.category.create({
        data: createCategoryDto,
      });
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException('A category with this name already exists');
      }

      throw error;
    }
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
      });
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException('A category with this name already exists');
      }

      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Category not found');
      }

      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.category.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2003')) {
        throw new ConflictException(
          'Category cannot be deleted because it has associated products',
        );
      }

      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Category not found');
      }

      throw error;
    }
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === code
    );
  }
}
