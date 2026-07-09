import { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function getCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.data || [];
  } catch {
    return [];
  }
}

async function getProducts() {
  try {
    // Fetch up to 100 products for sitemap indexing
    const res = await fetch(`${API_BASE}/products?limit=100`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://anjalialankaram.com';

  // Static routes
  const staticRoutes = [
    '',
    '/products',
    '/cart',
    '/checkout',
    '/wishlist',
    '/track-order',
    '/profile',
    '/login',
    '/contact',
    '/shipping',
    '/returns',
    '/terms',
    '/privacy',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Dynamic Category routes
  const categories = await getCategories();
  const categoryRoutes = categories.map((cat: any) => ({
    url: `${baseUrl}/products?category=${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Dynamic Product detail routes
  const products = await getProducts();
  const productRoutes = products.map((prod: any) => ({
    url: `${baseUrl}/products/${prod.slug}`,
    lastModified: new Date(prod.updatedAt || prod.createdAt || new Date()),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
