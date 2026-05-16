import Link from 'next/link'
import { ShoppingBag, Search, User, Heart } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-outfit text-2xl font-bold tracking-tight text-primary">
              Anjali Alankaram
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/products?category=new-arrivals" className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              New Arrivals
            </Link>
            <Link href="/products?category=sarees" className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Sarees
            </Link>
            <Link href="/products?category=kurta-sets" className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Kurta Sets
            </Link>
            <Link href="/products?category=dresses" className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Dresses
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          <Link href="/wishlist" className="text-muted-foreground hover:text-foreground transition-colors">
            <Heart className="h-5 w-5" />
            <span className="sr-only">Wishlist</span>
          </Link>
          <Link href="/cart" className="text-muted-foreground hover:text-foreground transition-colors relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              0
            </span>
            <span className="sr-only">Cart</span>
          </Link>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
            <User className="h-5 w-5" />
            <span className="sr-only">Profile</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
