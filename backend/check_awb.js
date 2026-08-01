const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL = 'postgresql://postgres:AnjaliAlankaram2026Secure@anjali-alankaram-db-wiped.c56m6guc44tf.ap-south-2.rds.amazonaws.com:5432/anjali_alankaram?schema=public&connection_limit=20';

const prisma = new PrismaClient();

async function run() {
  try {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: {
        awbCode: { not: null }
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        awbCode: true,
        courierName: true,
        shippedAt: true,
        createdAt: true,
        address: { select: { city: true, state: true, name: true } }
      }
    });
    console.log('=== Orders with AWB (most recent first) ===');
    orders.forEach(o => {
      console.log(`\nOrder: ${o.orderNumber}`);
      console.log(`  Status: ${o.status}`);
      console.log(`  AWB: ${o.awbCode}`);
      console.log(`  Courier: ${o.courierName || 'N/A'}`);
      console.log(`  Customer City: ${o.address?.city || 'N/A'}, ${o.address?.state || ''}`);
      console.log(`  Shipped At: ${o.shippedAt || 'Not shipped yet'}`);
    });
    if (orders.length === 0) console.log('No orders with AWB found.');
    
    // Also specifically search for 7D135670313
    const specific = await prisma.order.findFirst({
      where: {
        OR: [
          { awbCode: { contains: '7D135670313', mode: 'insensitive' } },
          { awbCode: { contains: '7D135670314', mode: 'insensitive' } },
        ]
      },
      include: { address: true }
    });
    console.log('\n=== Search for AWB 7D135670313/14 ===');
    console.log(specific ? JSON.stringify(specific, null, 2) : 'NOT FOUND in database');
  } catch (e) {
    console.error('DB Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
