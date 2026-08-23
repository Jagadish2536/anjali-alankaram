const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findProducts() {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, basePrice: true, salePrice: true, slug: true }
    });

    console.log('=== FINDING MATCHING PRODUCTS ===');
    console.log(`Searching across ${products.length} active products...`);

    const p1313 = products.filter(p => Number(p.salePrice || p.basePrice) === 1313 || Number(p.salePrice || p.basePrice) === 1299 || Number(p.salePrice || p.basePrice) === 1399);
    const p2314 = products.filter(p => Number(p.salePrice || p.basePrice) === 2314 || Number(p.salePrice || p.basePrice) === 2299 || Number(p.salePrice || p.basePrice) === 2399);

    console.log('\nMatches around ₹1,313:');
    p1313.forEach(p => console.log(` - [${p.id}] ${p.name} | Price: ₹${p.salePrice || p.basePrice}`));

    console.log('\nMatches around ₹2,314:');
    p2314.forEach(p => console.log(` - [${p.id}] ${p.name} | Price: ₹${p.salePrice || p.basePrice}`));

  } catch (err) {
    console.error('Error finding products:', err);
  } finally {
    await prisma.$disconnect();
  }
}

findProducts();
