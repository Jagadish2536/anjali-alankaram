-- Add storeAddress and businessHours to store_settings
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "storeAddress" TEXT;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "businessHours" TEXT DEFAULT E'Monday - Saturday: 10:00 AM - 7:00 PM\nSunday: Closed';
