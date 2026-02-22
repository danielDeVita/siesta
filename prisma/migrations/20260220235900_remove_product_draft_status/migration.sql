-- Replace ProductStatus enum to remove DRAFT and normalize existing rows.
ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";

CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

ALTER TABLE "products"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ProductStatus"
  USING (
    CASE
      WHEN "status"::text = 'DRAFT' THEN 'ARCHIVED'
      ELSE "status"::text
    END
  )::"ProductStatus",
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

DROP TYPE "ProductStatus_old";
