// Migration script — adds new enum values and creates new tables
// Run with: node prisma/migrate.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running enterprise migration...');

  // 1. Add new enum values (PostgreSQL doesn't support IF NOT EXISTS for enums natively,
  //    so we check pg_enum manually)
  const enumAdditions = [
    // OrderStatus new values
    { type: 'OrderStatus', value: 'PENDING_PAYMENT' },
    { type: 'OrderStatus', value: 'PAYMENT_VERIFIED' },
    { type: 'OrderStatus', value: 'INVENTORY_RESERVED' },
    { type: 'OrderStatus', value: 'PICKING' },
    { type: 'OrderStatus', value: 'PACKED' },
    { type: 'OrderStatus', value: 'READY_FOR_SHIPMENT' },
    { type: 'OrderStatus', value: 'IN_TRANSIT' },
    { type: 'OrderStatus', value: 'PICKUP_SCHEDULED' },
    { type: 'OrderStatus', value: 'RETURNED' },
    { type: 'OrderStatus', value: 'REFUND_INITIATED' },
    // Role
    { type: 'Role', value: 'WAREHOUSE_STAFF' },
    // PaymentStatus
    { type: 'PaymentStatus', value: 'REFUND_INITIATED' },
    // NotificationType
    { type: 'NotificationType', value: 'ORDER_CONFIRMED' },
    { type: 'NotificationType', value: 'ORDER_OUT_FOR_DELIVERY' },
    { type: 'NotificationType', value: 'ORDER_UPDATE' },
    { type: 'NotificationType', value: 'REFUND_UPDATE' },
    { type: 'NotificationType', value: 'LOW_STOCK_ALERT' },
  ];

  for (const { type, value } of enumAdditions) {
    try {
      const existing = await prisma.$queryRawUnsafe(
        `SELECT 1 FROM pg_enum WHERE enumlabel = $1 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $2)`,
        value, type
      );
      if (!existing || existing.length === 0) {
        await prisma.$executeRawUnsafe(`ALTER TYPE "${type}" ADD VALUE '${value}'`);
        console.log(`  ✅ Added ${type}.${value}`);
      } else {
        console.log(`  ⏭  ${type}.${value} already exists`);
      }
    } catch (e) {
      console.log(`  ⚠  ${type}.${value}: ${e.message}`);
    }
  }

  // 2. Create new enum types
  const newEnums = [
    {
      name: 'InventoryMovementType',
      values: ['RESERVED', 'RESERVATION_RELEASED', 'DEDUCTED', 'RESTOCKED', 'ADJUSTED']
    },
    {
      name: 'WarehouseStatus',
      values: ['ACTIVE', 'INACTIVE', 'MAINTENANCE']
    }
  ];

  for (const { name, values } of newEnums) {
    try {
      const existing = await prisma.$queryRawUnsafe(
        `SELECT 1 FROM pg_type WHERE typname = $1`, name
      );
      if (!existing || existing.length === 0) {
        const valStr = values.map(v => `'${v}'`).join(', ');
        await prisma.$executeRawUnsafe(`CREATE TYPE "${name}" AS ENUM (${valStr})`);
        console.log(`  ✅ Created enum ${name}`);
      } else {
        console.log(`  ⏭  enum ${name} already exists`);
      }
    } catch (e) {
      console.log(`  ⚠  enum ${name}: ${e.message}`);
    }
  }

  // 3. Create new tables
  console.log('\n📦 Creating new tables...');

  // warehouses
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "warehouses" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "address" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "state" TEXT NOT NULL,
      "pincode" TEXT NOT NULL,
      "phone" TEXT,
      "email" TEXT,
      "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "warehouses_code_key" ON "warehouses"("code")`);
  console.log('  ✅ warehouses');

  // warehouse_inventory
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "warehouse_inventory" (
      "id" TEXT NOT NULL,
      "warehouseId" TEXT NOT NULL,
      "variantId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "reserved" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "warehouse_inventory_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "warehouse_inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE,
      CONSTRAINT "warehouse_inventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_inventory_warehouseId_variantId_key" ON "warehouse_inventory"("warehouseId", "variantId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "warehouse_inventory_warehouseId_idx" ON "warehouse_inventory"("warehouseId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "warehouse_inventory_variantId_idx" ON "warehouse_inventory"("variantId")`);
  console.log('  ✅ warehouse_inventory');

  // order_status_history
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "order_status_history" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "fromStatus" "OrderStatus",
      "toStatus" "OrderStatus" NOT NULL,
      "actorId" TEXT,
      "actorRole" TEXT,
      "notes" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_status_history_orderId_idx" ON "order_status_history"("orderId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_status_history_createdAt_idx" ON "order_status_history"("createdAt")`);
  console.log('  ✅ order_status_history');

  // inventory_reservations
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "inventory_reservations" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "variantId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
      "isReleased" BOOLEAN NOT NULL DEFAULT false,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "inventory_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
      CONSTRAINT "inventory_reservations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "inventory_reservations_orderId_idx" ON "inventory_reservations"("orderId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "inventory_reservations_variantId_idx" ON "inventory_reservations"("variantId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "inventory_reservations_expiresAt_idx" ON "inventory_reservations"("expiresAt")`);
  console.log('  ✅ inventory_reservations');

  // inventory_logs
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "inventory_logs" (
      "id" TEXT NOT NULL,
      "variantId" TEXT NOT NULL,
      "type" "InventoryMovementType" NOT NULL,
      "quantity" INTEGER NOT NULL,
      "stockBefore" INTEGER NOT NULL,
      "stockAfter" INTEGER NOT NULL,
      "orderId" TEXT,
      "actorId" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "inventory_logs_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "inventory_logs_variantId_idx" ON "inventory_logs"("variantId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "inventory_logs_orderId_idx" ON "inventory_logs"("orderId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "inventory_logs_createdAt_idx" ON "inventory_logs"("createdAt")`);
  console.log('  ✅ inventory_logs');

  // payment_transactions
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "payment_transactions" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "amount" DECIMAL(10,2) NOT NULL,
      "status" TEXT NOT NULL,
      "gateway" TEXT NOT NULL,
      "gatewayRef" TEXT,
      "failReason" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "payment_transactions_orderId_idx" ON "payment_transactions"("orderId")`);
  console.log('  ✅ payment_transactions');

  // offers
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "offers" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "buyQuantity" INTEGER NOT NULL,
      "getQuantity" INTEGER NOT NULL,
      "minProductPrice" DECIMAL(10,2),
      "maxProductPrice" DECIMAL(10,2),
      "productIds" TEXT[] DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('  ✅ offers');

  // 4. Add new columns to existing tables
  console.log('\n🔧 Adding columns to existing tables...');

  const alterations = [
    // orders new columns
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "giftCharge" DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "giftMessage" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "isGift" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "courierName" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "courierTrackingId" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP(3)`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "returnRequestedAt" TIMESTAMP(3)`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "returnApprovedAt" TIMESTAMP(3)`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickupScheduledAt" TIMESTAMP(3)`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "returnedAt" TIMESTAMP(3)`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refundInitiatedAt" TIMESTAMP(3)`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3)`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickupSlot" TEXT`,
    // order_items new columns
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "sku" TEXT`,
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "isPicked" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "isPacked" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "pickedAt" TIMESTAMP(3)`,
    `ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "packedAt" TIMESTAMP(3)`,
    // product_variants new column
    `ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "reservedStock" INTEGER NOT NULL DEFAULT 0`,
    // users new column
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT`,
    // notifications new column
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "sentVia" TEXT[] DEFAULT '{}'`,
    // store_settings new columns
    `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 5`,
    `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "reservationTimeoutMins" INTEGER NOT NULL DEFAULT 5`,
    `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "platformFeeEnabled" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "platformFeeAmount" FLOAT NOT NULL DEFAULT 0`,
    `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "couponsEnabled" BOOLEAN NOT NULL DEFAULT true`,
    `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "offersEnabled" BOOLEAN NOT NULL DEFAULT true`,
    `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "giftEnabled" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "giftAmount" FLOAT NOT NULL DEFAULT 35`,
    `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "heroLeftImageUrl" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "offerDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "offerId" TEXT`,
    `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "offerTitle" TEXT`,
    `ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "offerType" TEXT NOT NULL DEFAULT 'BUY_X_GET_Y'`,
    `ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "offerPrice" DECIMAL(10,2)`,
    `ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "sizeGuide" JSONB`,
    `CREATE TABLE IF NOT EXISTS "restock_notifications" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "variantId" TEXT NOT NULL,
      "isSent" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "restock_notifications_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "restock_notifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "restock_notifications_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  ];

  for (const sql of alterations) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log(`  ⚠  ${e.message.substring(0, 80)}`);
      }
    }
  }
  console.log('  ✅ Column additions complete');

  // 5. Add indexes to existing tables
  const indexes = [
    `CREATE INDEX IF NOT EXISTS "orders_userId_idx" ON "orders"("userId")`,
    `CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status")`,
    `CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "orders_orderNumber_idx" ON "orders"("orderNumber")`,
    `CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status")`,
    `CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId")`,
    `CREATE INDEX IF NOT EXISTS "products_slug_idx" ON "products"("slug")`,
    `CREATE INDEX IF NOT EXISTS "product_variants_productId_idx" ON "product_variants"("productId")`,
    `CREATE INDEX IF NOT EXISTS "product_variants_sku_idx" ON "product_variants"("sku")`,
    `CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId")`,
    `CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email")`,
    `CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role")`,
    `CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead")`,
  ];

  for (const sql of indexes) {
    try { await prisma.$executeRawUnsafe(sql); } catch {}
  }
  console.log('  ✅ Indexes added');

  // 6. Change orders.status default to PENDING_PAYMENT
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT'::"OrderStatus"`);
    console.log('  ✅ Updated orders.status default to PENDING_PAYMENT');
  } catch (e) {
    console.log(`  ⚠  ${e.message.substring(0, 80)}`);
  }

  console.log('\n✅ Enterprise migration complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
