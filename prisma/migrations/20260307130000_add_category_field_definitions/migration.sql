CREATE TYPE "CategoryFieldType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'BOOLEAN');

CREATE TABLE "category_field_definitions" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CategoryFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT,
    "options_json" JSONB,
    "show_in_catalog" BOOLEAN NOT NULL DEFAULT false,
    "show_in_detail" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_field_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_field_values" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "category_field_definition_id" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_field_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "category_field_definitions_category_id_key_key" ON "category_field_definitions"("category_id", "key");
CREATE INDEX "category_field_definitions_category_id_sort_order_idx" ON "category_field_definitions"("category_id", "sort_order");

CREATE UNIQUE INDEX "product_field_values_product_id_category_field_definition_id_key" ON "product_field_values"("product_id", "category_field_definition_id");
CREATE INDEX "product_field_values_category_field_definition_id_idx" ON "product_field_values"("category_field_definition_id");

ALTER TABLE "category_field_definitions"
ADD CONSTRAINT "category_field_definitions_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_field_values"
ADD CONSTRAINT "product_field_values_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_field_values"
ADD CONSTRAINT "product_field_values_category_field_definition_id_fkey"
FOREIGN KEY ("category_field_definition_id") REFERENCES "category_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
