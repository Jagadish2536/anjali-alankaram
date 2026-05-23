-- Add new enum values to existing enums safely
DO \$\$
BEGIN
  -- OrderStatus new values
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_PAYMENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_PAYMENT' BEFORE 'PENDING';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAYMENT_VERIFIED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_VERIFIED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INVENTORY_RESERVED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'INVENTORY_RESERVED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PICKING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PICKING';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PACKED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PACKED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'READY_FOR_SHIPMENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'READY_FOR_SHIPMENT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'IN_TRANSIT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'IN_TRANSIT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PICKUP_SCHEDULED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PICKUP_SCHEDULED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RETURNED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REFUND_INITIATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'REFUND_INITIATED';
  END IF;
  -- Role new value
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'WAREHOUSE_STAFF' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'WAREHOUSE_STAFF';
  END IF;
  -- PaymentStatus new value
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REFUND_INITIATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentStatus')) THEN
    ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_INITIATED';
  END IF;
  -- NotificationType new values
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_CONFIRMED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CONFIRMED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_OUT_FOR_DELIVERY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_OUT_FOR_DELIVERY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_UPDATE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_UPDATE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REFUND_UPDATE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'REFUND_UPDATE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LOW_STOCK_ALERT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'LOW_STOCK_ALERT';
  END IF;
  -- InventoryMovementType (new enum)
  -- WarehouseStatus (new enum)
END
\$\$;
