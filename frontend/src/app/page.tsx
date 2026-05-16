import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative h-[70vh] bg-accent/20 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
           {/* Placeholder for hero image */}
           <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070')] bg-cover bg-center opacity-60"></div>
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
            <Link href="/products" className="bg-white text-foreground px-8 py-3 rounded-full font-medium hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
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
          <Link href="/categories" className="text-primary font-medium hover:underline hidden md:block">
            View All
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {/* Category Cards (Mocked for now) */}
          {[
            { name: 'Sarees', img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600' },
            { name: 'Kurta Sets', img: 'https://images.unsplash.com/photo-1583391733958-d25e27a26aca?q=80&w=600' },
            { name: 'Dresses', img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600' },
            { name: 'Bridal', img: 'https://images.unsplash.com/photo-1596455607563-ad6193f78b78?q=80&w=600' }
          ].map((cat, i) => (
            <Link href={`/products?category=${cat.name.toLowerCase()}`} key={i} className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
              <Image src={cat.img} alt={cat.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-xl font-medium font-outfit">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
