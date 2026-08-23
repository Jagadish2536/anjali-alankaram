const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const userCount = await prisma.user.count();
    const latestUsers = await prisma.user.findMany({ 
      orderBy: { createdAt: 'desc' }, 
      take: 5,
      select: { id: true, email: true, name: true, phone: true, createdAt: true }
    });
    const orderCount = await prisma.order.count();
    const latestOrders = await prisma.order.findMany({ 
      orderBy: { createdAt: 'desc' }, 
      take: 5,
      select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true }
    });
    
    console.log('--- LIVE VPC DATABASE AUDIT ---');
    console.log('TOTAL REGISTERED USERS:', userCount);
    console.log('MOST RECENT USER SIGNUPS:');
    console.dir(latestUsers, { depth: null });
    
    console.log('TOTAL ORDERS PLACED:', orderCount);
    console.log('MOST RECENT ORDERS PLACED:');
    console.dir(latestOrders, { depth: null });
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
