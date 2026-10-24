import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  MovementType,
  Prisma,
  type StockMovement,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';

const POSTGRES_INT_MAX = 2_147_483_647;

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createStockMovementDto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (createStockMovementDto.quantity > POSTGRES_INT_MAX) {
          await this.throwMovementError(
            transaction,
            createStockMovementDto.productId,
            createStockMovementDto.type,
          );
        }

        const updatedProducts =
          createStockMovementDto.type === MovementType.IN
            ? await transaction.product.updateMany({
                where: {
                  id: createStockMovementDto.productId,
                  isActive: true,
                  stock: {
                    lte: POSTGRES_INT_MAX - createStockMovementDto.quantity,
                  },
                },
                data: {
                  stock: { increment: createStockMovementDto.quantity },
                },
              })
            : await transaction.product.updateMany({
                where: {
                  id: createStockMovementDto.productId,
                  isActive: true,
                  stock: { gte: createStockMovementDto.quantity },
                },
                data: {
                  stock: { decrement: createStockMovementDto.quantity },
                },
              });

        if (updatedProducts.count === 0) {
          await this.throwMovementError(
            transaction,
            createStockMovementDto.productId,
            createStockMovementDto.type,
          );
        }

        return transaction.stockMovement.create({
          data: {
            productId: createStockMovementDto.productId,
            type: createStockMovementDto.type,
            quantity: createStockMovementDto.quantity,
            reason: createStockMovementDto.reason,
          },
        });
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Unable to register stock movement',
      );
    }
  }

  private async throwMovementError(
    transaction: Prisma.TransactionClient,
    productId: string,
    type: MovementType,
  ): Promise<never> {
    const product = await transaction.product.findUnique({
      where: { id: productId },
      select: { isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new ConflictException(
        'Inactive products cannot receive stock movements',
      );
    }

    if (type === MovementType.OUT) {
      throw new ConflictException('Insufficient stock');
    }

    throw new ConflictException('Maximum stock exceeded');
  }
}
