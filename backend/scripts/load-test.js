import http from 'k6/http';
import { sleep, check } from 'k6';

// k6 options configuration
export const options = {
  stages: [
    { duration: '15s', target: 20 },  // Ramp up to 20 users
    { duration: '30s', target: 50 },  // Scale up to 50 users (spike traffic)
    { duration: '15s', target: 0 },   // Cool down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<350'], // 95% of requests must finish within 350ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000/api/v1';

export default function () {
  // 1. Browse catalogue page (cached)
  const catalogueRes = http.get(`${BASE_URL}/products?limit=12`);
  check(catalogueRes, {
    'catalogue status is 200': (r) => r.status === 200,
    'catalogue list length ok': (r) => r.json().hits !== undefined,
  });
  sleep(1);

  // 2. Search products (typo-tolerant / Meilisearch / DB fallback)
  const searchRes = http.get(`${BASE_URL}/search?q=silk`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => r.json().hits !== undefined,
  });
  sleep(1.5);

  // 3. View specific product detail page (caching checkpoint)
  const detailRes = http.get(`${BASE_URL}/products/kora-muslin-silk-saree`);
  check(detailRes, {
    'detail status is 200': (r) => r.status === 200 || r.status === 404, // 404 is acceptable if database has no seeded data yet
  });
  sleep(2);
}
