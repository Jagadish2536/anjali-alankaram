-- Add shippingEnabled toggle to store_settings
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "shippingEnabled" BOOLEAN NOT NULL DEFAULT true;
