import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModule,
  type ThrottlerGenerateKeyFunction,
} from '@nestjs/throttler';
import { CategoriesModule } from './categories/categories.module.js';
import { validateEnvironment } from './config/environment.validation.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { ProductsModule } from './products/products.module.js';
import { StockMovementsModule } from './stock-movements/stock-movements.module.js';

const generateRateLimitKey: ThrottlerGenerateKeyFunction = (
  _context,
  tracker,
  throttlerName,
) => `${throttlerName}-${tracker}`;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('THROTTLE_TTL'),
          limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
          generateKey: generateRateLimitKey,
        },
      ],
    }),
    CategoriesModule,
    ProductsModule,
    StockMovementsModule,
    InventoryModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
