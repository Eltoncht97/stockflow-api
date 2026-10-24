-- Enforce SKU uniqueness after applying the same normalization used by the API.
-- PostgreSQL checks this index atomically during concurrent writes.
CREATE UNIQUE INDEX "products_sku_case_insensitive_key"
ON "products" (LOWER(BTRIM("sku")));

DROP INDEX "products_sku_key";
