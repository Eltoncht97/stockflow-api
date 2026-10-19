/*
  Warnings:

  - You are about to alter the column `name` on the `categories` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `description` on the `categories` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `sku` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `name` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(150)`.
  - You are about to alter the column `description` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.
  - You are about to alter the column `reason` on the `stock_movements` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "sku" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(150),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(1000);

-- AlterTable
ALTER TABLE "stock_movements" ALTER COLUMN "reason" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "products"
ADD CONSTRAINT "chk_products_price"
CHECK ("price" >= 0);

ALTER TABLE "products"
ADD CONSTRAINT "chk_products_stock"
CHECK ("stock" >= 0);

ALTER TABLE "products"
ADD CONSTRAINT "chk_products_min_stock"
CHECK ("min_stock" >= 0);

ALTER TABLE "stock_movements"
ADD CONSTRAINT "chk_stock_movements_quantity"
CHECK ("quantity" > 0);