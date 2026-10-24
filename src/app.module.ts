import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from './categories/categories.module.js';
import { validateEnvironment } from './config/environment.validation.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { ProductsModule } from './products/products.module.js';
import { StockMovementsModule } from './stock-movements/stock-movements.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    CategoriesModule,
    ProductsModule,
    StockMovementsModule,
    InventoryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
