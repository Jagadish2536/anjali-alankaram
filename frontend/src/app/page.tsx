'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const FALLBACK_IMAGES: Record<string, string> = {
  saree: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600',
  sarees: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600',
  kurta: 'https://images.unsplash.com/photo-1583391733958-d25e27a26aca?q=80&w=600',
  'kurta-sets': 'https://images.unsplash.com/photo-1583391733958-d25e27a26aca?q=80&w=600',
  dress: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600',
  dresses: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600',
  bridal: 'https://images.unsplash.com/photo-1596455607563-ad6193f78b78?q=80&w=600',
};

function getCategoryImage(cat: any): string {
  if (cat.image) return cat.image;
  const slug = cat.slug?.toLowerCase() || '';
  const name = cat.name?.toLowerCase() || '';
  return FALLBACK_IMAGES[slug] || FALLBACK_IMAGES[name] || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600';
}

export default function Home() {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      const list = Array.isArray(data) ? data : data.data || [];
      setCategories(list);
    }).catch(() => {});
  }, []);

  // Fallback static categories when DB has none
  const displayCategories = categories.length > 0 ? categories : [
    { id: '1', name: 'Sarees', slug: 'sarees', image: null },
    { id: '2', name: 'Kurta Sets', slug: 'kurta-sets', image: null },
    { id: '3', name: 'Dresses', slug: 'dresses', image: null },
    { id: '4', name: 'Bridal', slug: 'bridal', image: null },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative h-[70vh] bg-accent/20 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070"
            alt="Hero background - women's fashion collection"
            fill
            className="object-cover object-center opacity-60"
            priority
          />
        </div>
        <div className="z-10 text-center px-4 max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-outfit font-bold text-foreground mb-6 tracking-tight">
            Elegance <br/><span className="text-primary italic">Redefined</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 mb-8 max-w-xl mx-auto">
            Discover our new festive collection. Curated for the modern Indian woman.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/products" className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
              Shop Now
            </Link>
            <Link href="/products?filter=new" className="bg-white text-foreground px-8 py-3 rounded-full font-medium hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
              New Arrivals
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="w-full max-w-7xl px-4 py-20 mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-outfit font-bold text-foreground">Shop by Category</h2>
            <p className="text-muted-foreground mt-2">Explore our wide range of collections</p>
          </div>
          <Link href="/products" className="text-primary font-medium hover:underline hidden md:block">
            View All
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {displayCategories.map((cat) => (
            <Link 
              href={`/products?category=${cat.slug}`} 
              key={cat.id} 
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl"
            >
              <Image 
                src={getCategoryImage(cat)} 
                alt={cat.name} 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-xl font-medium font-outfit capitalize">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
