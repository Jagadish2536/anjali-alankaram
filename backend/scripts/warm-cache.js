/**
 * Anjali Alankaram - Production Cache Warming Script
 * 
 * Invoked post-deployment to warm up CloudFront CDN edge cache
 * and Next.js ISR static pages.
 */
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'https://api.anjalialankaram.com/api/v1';
const SITE_BASE = process.env.SITE_URL || 'https://anjalialankaram.com';

const TARGETS = [
  '/',
  '/products',
  '/contact',
  '/privacy',
  '/terms',
  '/shipping',
];

async function warmUrl(url) {
  try {
    const start = Date.now();
    await axios.get(url, {
      headers: { 'User-Agent': 'AnjaliAlankaram-CacheWarming/1.0' },
      timeout: 15000,
    });
    console.log(`✅ Cache Warmed: ${url} (${Date.now() - start}ms)`);
  } catch (err) {
    console.warn(`⚠️ Failed to warm: ${url} | ${err.message}`);
  }
}

async function run() {
  console.log('🏁 Starting Cache Warming Sequence...');
  
  // 1. Warm static app shells
  for (const path of TARGETS) {
    await warmUrl(`${SITE_BASE}${path}`);
  }

  // 2. Query products database list
  try {
    console.log('🔍 Fetching catalog slugs from products API...');
    const response = await axios.get(`${API_BASE}/products?limit=100`);
    const products = response.data?.hits || [];

    console.log(`📦 Found ${products.length} product slugs. Initializing warmups...`);

    // Warm up detail pages concurrently in batches of 5
    const batchSize = 5;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await Promise.all(
        batch.map((p) => {
          if (p.slug) {
            return warmUrl(`${SITE_BASE}/products/${p.slug}`);
          }
          return Promise.resolve();
        })
      );
    }
  } catch (err) {
    console.error('❌ Failed to fetch products list for warming:', err.message);
  }

  console.log('🎉 Cache warming sequence completed successfully!');
}

run();
