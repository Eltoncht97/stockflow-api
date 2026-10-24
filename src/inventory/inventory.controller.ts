import { Controller, Get, Query } from '@nestjs/common';
import { InventoryQueryDto } from './dto/inventory-query.dto.js';
import { InventoryService } from './inventory.service.js';
import type {
  InventoryItemResponse,
  InventorySummaryResponse,
} from './types/inventory-response.type.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(
    @Query() inventoryQueryDto: InventoryQueryDto,
  ): Promise<InventoryItemResponse[]> {
    return this.inventoryService.findAll(inventoryQueryDto);
  }

  @Get('low-stock')
  findLowStock(): Promise<InventoryItemResponse[]> {
    return this.inventoryService.findLowStock();
  }

  @Get('summary')
  getSummary(): Promise<InventorySummaryResponse> {
    return this.inventoryService.getSummary();
  }
}
