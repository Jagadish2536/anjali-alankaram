-- Run this SQL directly on your PostgreSQL database to add new roles
-- Command: psql $DATABASE_URL -f migrate_roles.sql

-- Add ORDER_MANAGER and STOCK_MANAGER to the Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ORDER_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STOCK_MANAGER';
