const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📦 Updating all current SHIPPED orders to DELIVERED status...');
  const result = await prisma.order.updateMany({
    where: {
      status: { in: ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
    },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
    },
  });
  console.log(`✅ Bulk updated ${result.count} shipped orders to DELIVERED!`);
}

main()
  .catch((err) => console.error('Error updating shipped orders:', err))
  .finally(() => prisma.$disconnect());
