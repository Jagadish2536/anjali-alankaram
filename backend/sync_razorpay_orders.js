const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const razorpayOrders = [
  {
    paymentId: 'pay_TT2GG63AZaD8ml',
    orderId: 'order_TT2GG63AZaD8ml',
    rrn: '319066205722',
    email: 'gayatrikesanakurthi@gmail.com',
    phone: '+919346134277',
    amount: 1313.00,
    timestamp: new Date('2026-08-23T01:48:00Z') // 7:18 AM IST
  },
  {
    paymentId: 'pay_TT38ZCWQKFGLRX',
    orderId: 'order_TT38TqQugqTbpQ',
    rrn: '623550896894',
    email: 'amulraniskv@gmail.com',
    upiVpa: 'amul.lucky-1@okaxis',
    phone: '+918754455521',
    amount: 2314.00,
    timestamp: new Date('2026-08-23T02:40:00Z') // 8:10 AM IST
  }
];

async function syncOrders() {
  console.log('=== SYNCING TODAY RAZORPAY CAPTURED ORDERS ===');
  for (const item of razorpayOrders) {
    try {
      // 1. Find or Create User
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: item.email },
            { phone: item.phone }
          ]
        }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: item.email,
            phone: item.phone,
            name: item.email.split('@')[0],
            role: 'CUSTOMER',
            isPhoneVerified: true,
            isEmailVerified: true,
            createdAt: item.timestamp
          }
        });
        console.log(`✅ Created User Profile: ${user.email} (ID: ${user.id})`);
      } else {
        console.log(`ℹ️ Existing User Found: ${user.email} (ID: ${user.id})`);
      }

      // 2. Find or Create Address for User
      let address = await prisma.address.findFirst({
        where: { userId: user.id }
      });

      if (!address) {
        address = await prisma.address.create({
          data: {
            name: 'Home',
            userId: user.id,
            phone: user.phone || '+910000000000',
            line1: 'Customer Address',
            city: 'City',
            state: 'State',
            pincode: '500001',
            country: 'India',
            type: 'HOME',
            isDefault: true
          }
        });
      }

      // 3. Check if Order exists
      let order = await prisma.order.findFirst({
        where: {
          OR: [
            { razorpayOrderId: item.orderId },
            { razorpayOrderId: item.paymentId },
            { notes: { contains: item.paymentId } }
          ]
        }
      });

      if (!order) {
        const orderCount = await prisma.order.count();
        const orderNumber = `AA-ORD-${String(orderCount + 1001).padStart(6, '0')}`;
        
        order = await prisma.order.create({
          data: {
            orderNumber: orderNumber,
            user: { connect: { id: user.id } },
            address: { connect: { id: address.id } },
            totalAmount: item.amount,
            subtotal: item.amount,
            status: 'PAYMENT_VERIFIED',
            paymentStatus: 'PAID',
            paymentMethod: 'RAZORPAY',
            razorpayOrderId: item.orderId || item.paymentId,
            notes: `Razorpay Payment ID: ${item.paymentId}, Order ID: ${item.orderId || ''}, RRN: ${item.rrn}, Sync: Auto-Recovered`,
            createdAt: item.timestamp,
            updatedAt: new Date()
          }
        });
        console.log(`🎉 SUCCESS: Recovered Order #${order.orderNumber} for ${user.email} - Total: ₹${item.amount}`);
      } else {
        console.log(`ℹ️ Order #${order.orderNumber} already exists in DB.`);
      }
    } catch (err) {
      console.error(`❌ Error syncing payment ${item.paymentId}:`, err);
    }
  }
}

syncOrders().finally(() => prisma.$disconnect());
