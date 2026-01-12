-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN "priceRub" DECIMAL(65,30), ADD COLUMN "valueRub" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "PriceSnapshot" ADD COLUMN "priceRub" DECIMAL(65,30);
