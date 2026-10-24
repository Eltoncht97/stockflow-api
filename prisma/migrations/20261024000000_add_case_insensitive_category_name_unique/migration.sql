-- Enforce category name uniqueness after applying the same normalization used
-- by the API. PostgreSQL checks this index atomically during concurrent writes.
CREATE UNIQUE INDEX "categories_name_case_insensitive_key"
ON "categories" (LOWER(BTRIM("name")));

DROP INDEX "categories_name_key";
