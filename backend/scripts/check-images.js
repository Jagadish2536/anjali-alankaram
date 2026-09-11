const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    take: 5,
    select: { id: true, name: true, images: true }
  });
  console.log('Product image URLs in DB:', JSON.stringify(products, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
