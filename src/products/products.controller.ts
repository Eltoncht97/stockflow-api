import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';
import type { ProductResponse } from './types/product-response.type.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(): Promise<ProductResponse[]> {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponse> {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto): Promise<ProductResponse> {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponse> {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<ProductResponse> {
    this.ensureEmptyBody(body);
    return this.productsService.deactivate(id);
  }

  @Patch(':id/activate')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<ProductResponse> {
    this.ensureEmptyBody(body);
    return this.productsService.activate(id);
  }

  private ensureEmptyBody(body: unknown): void {
    if (
      body !== undefined &&
      body !== null &&
      (typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).length > 0)
    ) {
      throw new BadRequestException('Request body is not allowed');
    }
  }
}
