import type { InventoryStatus } from '../inventory-status.enum.js';

export interface InventoryItemResponse {
  productId: string;
  sku: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
  stock: number;
  minStock: number;
  status: InventoryStatus;
}

export interface InventorySummaryResponse {
  totalProducts: number;
  totalUnits: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}
