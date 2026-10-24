import { Body, Controller, Post } from '@nestjs/common';
import type { StockMovement } from '../generated/prisma/client.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { StockMovementsService } from './stock-movements.service.js';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Post()
  create(
    @Body() createStockMovementDto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    return this.stockMovementsService.create(createStockMovementDto);
  }
}
