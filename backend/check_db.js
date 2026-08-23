const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const userCount = await prisma.user.count();
    const latestUsers = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    const orderCount = await prisma.order.count();
    const latestOrders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    
    console.log('=== LIVE DATABASE AUDIT RESULT ===');
    console.log('TOTAL USERS:', userCount);
    console.log('LATEST USERS CREATED:');
    latestUsers.forEach(u => console.log(` - ID: ${u.id}, Name: ${u.name || u.email || 'User'}, CreatedAt: ${u.createdAt}`));
    
    console.log('\nTOTAL ORDERS:', orderCount);
    console.log('LATEST ORDERS PLACED:');
    latestOrders.forEach(o => console.log(` - Order #${o.orderNumber || o.id}, Status: ${o.status}, Total: ₹${o.totalAmount || o.total}, CreatedAt: ${o.createdAt}`));
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
