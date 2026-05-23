// Seed store_settings with default values
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.storeSettings.findFirst();
  if (existing) {
    console.log('StoreSettings already exists:', existing.id);
    return;
  }

  const settings = await prisma.storeSettings.create({
    data: {
      storeName: 'Anjali Alankaram',
      supportEmail: 'support@anjalialankaram.com',
      supportPhone: '+91 9876543210',
      whatsappNumber: '+91 9876543210',
      instagramUrl: 'https://instagram.com/anjalialankaram',
      currency: 'INR',
      currencySymbol: '₹',
      gstEnabled: true,
      gstRate: 18,
      freeShippingThreshold: 499,
      shippingCharge: 49,
      codEnabled: true,
      codCharges: 0,
      couponsEnabled: true,
      giftEnabled: false,
      giftAmount: 35,
      platformFeeEnabled: false,
      platformFeeAmount: 0,
      lowStockThreshold: 5,
      reservationTimeoutMins: 15,
      returnPolicyDays: 7,
      storeDescription: 'Premium Indian ethnic fashion for every occasion.',
      contactEmail: 'support@anjalialankaram.com',
      contactPhone: '+91 9876543210',
    },
  });
  console.log('Created StoreSettings:', settings.id);
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
