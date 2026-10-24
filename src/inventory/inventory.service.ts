import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { InventoryQueryDto } from './dto/inventory-query.dto.js';
import { InventoryStatus } from './inventory-status.enum.js';
import type {
  InventoryItemResponse,
  InventorySummaryResponse,
} from './types/inventory-response.type.js';

interface InventoryRow {
  productId: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  stock: number;
  minStock: number;
  status: InventoryStatus;
}

interface InventorySummaryRow {
  totalProducts: bigint;
  totalUnits: bigint;
  inStockProducts: bigint;
  lowStockProducts: bigint;
  outOfStockProducts: bigint;
}

const STOCK_STATUS_SQL = Prisma.sql`
  CASE
    WHEN p.stock = 0 THEN ${InventoryStatus.OUT_OF_STOCK}
    WHEN p.stock > 0 AND p.stock <= p.min_stock THEN ${InventoryStatus.LOW_STOCK}
    ELSE ${InventoryStatus.IN_STOCK}
  END
`;

const buildInventoryCte = (conditions: Prisma.Sql[]): Prisma.Sql => Prisma.sql`
  WITH inventory AS (
    SELECT
      p.id AS "productId",
      p.sku,
      p.name,
      c.id AS "categoryId",
      c.name AS "categoryName",
      p.stock,
      p.min_stock AS "minStock",
      ${STOCK_STATUS_SQL} AS status
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE ${Prisma.join(conditions, ' AND ')}
  )
`;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    inventoryQueryDto: InventoryQueryDto,
  ): Promise<InventoryItemResponse[]> {
    const conditions = this.buildProductConditions(inventoryQueryDto);
    const statusCondition = inventoryQueryDto.status
      ? Prisma.sql`WHERE status = ${inventoryQueryDto.status}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<InventoryRow[]>(Prisma.sql`
      ${buildInventoryCte(conditions)}
      SELECT *
      FROM inventory
      ${statusCondition}
      ORDER BY name ASC, "productId" ASC
    `);

    return rows.map((row) => this.toInventoryItem(row));
  }

  async findLowStock(): Promise<InventoryItemResponse[]> {
    const rows = await this.prisma.$queryRaw<InventoryRow[]>(Prisma.sql`
      ${buildInventoryCte([Prisma.sql`p.is_active = TRUE`])}
      SELECT *
      FROM inventory
      WHERE status IN (
        ${InventoryStatus.OUT_OF_STOCK},
        ${InventoryStatus.LOW_STOCK}
      )
      ORDER BY
        CASE status
          WHEN ${InventoryStatus.OUT_OF_STOCK} THEN 0
          ELSE 1
        END,
        name ASC,
        "productId" ASC
    `);

    return rows.map((row) => this.toInventoryItem(row));
  }

  async getSummary(): Promise<InventorySummaryResponse> {
    const [summary] = await this.prisma.$queryRaw<InventorySummaryRow[]>(
      Prisma.sql`
        WITH inventory AS (
          SELECT
            p.stock,
            ${STOCK_STATUS_SQL} AS status
          FROM products p
          WHERE p.is_active = TRUE
        )
        SELECT
          COUNT(*) AS "totalProducts",
          COALESCE(SUM(stock), 0) AS "totalUnits",
          COUNT(*) FILTER (
            WHERE status = ${InventoryStatus.IN_STOCK}
          ) AS "inStockProducts",
          COUNT(*) FILTER (
            WHERE status = ${InventoryStatus.LOW_STOCK}
          ) AS "lowStockProducts",
          COUNT(*) FILTER (
            WHERE status = ${InventoryStatus.OUT_OF_STOCK}
          ) AS "outOfStockProducts"
        FROM inventory
      `,
    );

    return {
      totalProducts: Number(summary.totalProducts),
      totalUnits: Number(summary.totalUnits),
      inStockProducts: Number(summary.inStockProducts),
      lowStockProducts: Number(summary.lowStockProducts),
      outOfStockProducts: Number(summary.outOfStockProducts),
    };
  }

  private buildProductConditions(
    inventoryQueryDto: InventoryQueryDto,
  ): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [Prisma.sql`p.is_active = TRUE`];

    if (inventoryQueryDto.categoryId) {
      conditions.push(
        Prisma.sql`p.category_id = CAST(${inventoryQueryDto.categoryId} AS uuid)`,
      );
    }

    if (inventoryQueryDto.search) {
      conditions.push(Prisma.sql`
        (
          STRPOS(LOWER(p.sku), LOWER(${inventoryQueryDto.search})) > 0
          OR STRPOS(LOWER(p.name), LOWER(${inventoryQueryDto.search})) > 0
        )
      `);
    }

    return conditions;
  }

  private toInventoryItem(row: InventoryRow): InventoryItemResponse {
    return {
      productId: row.productId,
      sku: row.sku,
      name: row.name,
      category: {
        id: row.categoryId,
        name: row.categoryName,
      },
      stock: row.stock,
      minStock: row.minStock,
      status: row.status,
    };
  }
}
