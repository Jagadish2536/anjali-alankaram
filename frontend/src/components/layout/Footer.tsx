import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t bg-muted/40 mt-20">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-outfit text-xl font-bold text-primary">Anjali Alankaram</h3>
            <p className="text-sm text-muted-foreground">
              Premium women's fashion brand celebrating the elegance of Indian and modern aesthetics.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products?category=new" className="hover:text-primary transition-colors">New Arrivals</Link></li>
              <li><Link href="/products?category=sarees" className="hover:text-primary transition-colors">Sarees</Link></li>
              <li><Link href="/products?category=kurta-sets" className="hover:text-primary transition-colors">Kurta Sets</Link></li>
              <li><Link href="/products?category=dresses" className="hover:text-primary transition-colors">Dresses</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Help</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/track-order" className="hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link href="/returns" className="hover:text-primary transition-colors">Returns & Refunds</Link></li>
              <li><Link href="/shipping" className="hover:text-primary transition-colors">Shipping Info</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Anjali Alankaram. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            {/* Social Icons would go here */}
            <span>Instagram</span>
            <span>WhatsApp</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
