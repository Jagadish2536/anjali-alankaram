import { OffersService } from '../src/offers/offers.service';

const mockPrismaService: any = {
  storeSettings: {
    findFirst: jestFn(),
  },
  offer: {
    findMany: jestFn(),
  },
};

function jestFn() {
  let val: any = undefined;
  const fn = async (...args: any[]) => {
    return typeof val === 'function' ? val(...args) : val;
  };
  fn.mockResolvedValue = (v: any) => {
    val = v;
  };
  fn.mockImplementation = (f: any) => {
    val = f;
  };
  return fn;
}

async function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  const service = new OffersService(mockPrismaService);
  console.log('Starting verification of OffersService Buy X Get Y logic...');

  // Test 1: Disabled globally
  mockPrismaService.storeSettings.findFirst.mockResolvedValue({ offersEnabled: false });
  let result = await service.calculateBestOffer([{ product: { id: 'p1', basePrice: 100 }, quantity: 2 }]);
  await assert(result === null, 'Should return null if offers disabled globally');

  // Test 2: Active offers list empty
  mockPrismaService.storeSettings.findFirst.mockResolvedValue({ offersEnabled: true });
  mockPrismaService.offer.findMany.mockResolvedValue([]);
  result = await service.calculateBestOffer([{ product: { id: 'p1', basePrice: 100 }, quantity: 2 }]);
  await assert(result === null, 'Should return null if there are no active offers');

  // Test 3: Cart empty
  result = await service.calculateBestOffer([]);
  await assert(result === null, 'Should return null if cart is empty');

  // Test 4: Buy 1 Get 1 Free (cheapest free)
  mockPrismaService.offer.findMany.mockResolvedValue([
    {
      id: 'offer-bogo',
      title: 'Buy 1 Get 1 Free',
      isActive: true,
      buyQuantity: 1,
      getQuantity: 1,
      productIds: [],
      minProductPrice: null,
      maxProductPrice: null,
    },
  ]);

  // Cart: 1x p1 (100), 1x p2 (200), 1x p3 (300).
  // Total items = 3. Group size = 2. Free count = 1. Cheapest item (100) should be free.
  result = await service.calculateBestOffer([
    { product: { id: 'p1', basePrice: 100 }, quantity: 1 },
    { product: { id: 'p2', basePrice: 200 }, quantity: 1 },
    { product: { id: 'p3', basePrice: 300 }, quantity: 1 },
  ]);
  await assert(result !== null, 'BOGO offer should apply');
  await assert(result?.id === 'offer-bogo', 'BOGO offer ID matches');
  await assert(result?.discount === 100, `Expected discount 100, got ${result?.discount}`);

  // Test 5: Buy 2 Get 1 Free (cheapest free)
  mockPrismaService.offer.findMany.mockResolvedValue([
    {
      id: 'offer-b2g1',
      title: 'Buy 2 Get 1 Free',
      isActive: true,
      buyQuantity: 2,
      getQuantity: 1,
      productIds: [],
      minProductPrice: null,
      maxProductPrice: null,
    },
  ]);

  // Cart: 2x p1 (100), 2x p2 (200), 2x p3 (300), 1x p4 (400).
  // Total items = 7. Group size = 3. Free count = 2. Cheapest 2 items (100, 100) should be free. Total discount = 200.
  result = await service.calculateBestOffer([
    { product: { id: 'p1', basePrice: 100 }, quantity: 2 },
    { product: { id: 'p2', basePrice: 200 }, quantity: 2 },
    { product: { id: 'p3', basePrice: 300 }, quantity: 2 },
    { product: { id: 'p4', basePrice: 400 }, quantity: 1 },
  ]);
  await assert(result !== null, 'B2G1 offer should apply');
  await assert(result?.discount === 200, `Expected discount 200, got ${result?.discount}`);

  // Test 6: Restricted products (productIds)
  mockPrismaService.offer.findMany.mockResolvedValue([
    {
      id: 'offer-restricted',
      title: 'BOGO on sarees',
      isActive: true,
      buyQuantity: 1,
      getQuantity: 1,
      productIds: ['p1', 'p2'],
      minProductPrice: null,
      maxProductPrice: null,
    },
  ]);

  // Cart: 1x p1 (150, qualifies), 1x p2 (250, qualifies), 1x p3 (80, does not qualify).
  // Qualifying: 150, 250. Group size = 2. Free count = 1. Cheapest qualifying (150) should be free.
  result = await service.calculateBestOffer([
    { product: { id: 'p1', basePrice: 150 }, quantity: 1 },
    { product: { id: 'p2', basePrice: 250 }, quantity: 1 },
    { product: { id: 'p3', basePrice: 80 }, quantity: 1 },
  ]);
  await assert(result !== null, 'Restricted BOGO offer should apply');
  await assert(result?.discount === 150, `Expected discount 150, got ${result?.discount}`);

  // Test 7: Restricted by Price Range (minProductPrice & maxProductPrice)
  mockPrismaService.offer.findMany.mockResolvedValue([
    {
      id: 'offer-range',
      title: 'BOGO on Mid Range',
      isActive: true,
      buyQuantity: 1,
      getQuantity: 1,
      productIds: [],
      minProductPrice: 100,
      maxProductPrice: 500,
    },
  ]);

  // Cart: 1x p1 (80, too cheap), 1x p2 (150, qualifies), 1x p3 (300, qualifies), 1x p4 (600, too expensive).
  // Qualifying: 150, 300. Group size = 2. Free count = 1. Cheapest qualifying (150) should be free.
  result = await service.calculateBestOffer([
    { product: { id: 'p1', basePrice: 80 }, quantity: 1 },
    { product: { id: 'p2', basePrice: 150 }, quantity: 1 },
    { product: { id: 'p3', basePrice: 300 }, quantity: 1 },
    { product: { id: 'p4', basePrice: 600 }, quantity: 1 },
  ]);
  await assert(result !== null, 'Range offer should apply');
  await assert(result?.discount === 150, `Expected discount 150, got ${result?.discount}`);

  // Test 8: Select the best offer (maximum discount)
  mockPrismaService.offer.findMany.mockResolvedValue([
    {
      id: 'offer-a',
      title: 'BOGO on P1',
      isActive: true,
      buyQuantity: 1,
      getQuantity: 1,
      productIds: ['p1'],
      minProductPrice: null,
      maxProductPrice: null,
    },
    {
      id: 'offer-b',
      title: 'Buy 2 Get 1 on All',
      isActive: true,
      buyQuantity: 2,
      getQuantity: 1,
      productIds: [],
      minProductPrice: null,
      maxProductPrice: null,
    },
  ]);

  // Cart: 2x p1 (300) and 1x p2 (100)
  // Offer A (BOGO on P1): Qualifying: 300, 300. Discount = 300.
  // Offer B (B2G1 on All): Qualifying: 300, 300, 100. Discount = 100.
  // System should select Offer A (discount 300).
  result = await service.calculateBestOffer([
    { product: { id: 'p1', basePrice: 300 }, quantity: 2 },
    { product: { id: 'p2', basePrice: 100 }, quantity: 1 },
  ]);
  await assert(result !== null, 'Best offer should apply');
  await assert(result?.id === 'offer-a', `Expected offer-a, got ${result?.id}`);
  await assert(result?.discount === 300, `Expected discount 300, got ${result?.discount}`);

  console.log('✓ All 8 test cases passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
