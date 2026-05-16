'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Instagram, MessageCircle } from 'lucide-react';

export default function Footer() {
  const [settings, setSettings] = useState({
    storeName: 'Anjali Alankaram',
    instagramUrl: 'https://instagram.com/anjalialankaram',
    whatsappNumber: '+91 9876543210'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data) setSettings(prev => ({ ...prev, ...data }));
      } catch (e) {
        console.error('Failed to fetch settings');
      }
    };
    fetchSettings();
  }, []);

  return (
    <footer className="border-t bg-muted/40 mt-20">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-outfit text-xl font-bold text-primary">{settings.storeName}</h3>
            <p className="text-sm text-muted-foreground">
              Premium women's fashion brand celebrating the elegance of Indian and modern aesthetics.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-primary transition-colors">New Arrivals</Link></li>
              <li><Link href="/products" className="hover:text-primary transition-colors">Sarees</Link></li>
              <li><Link href="/products" className="hover:text-primary transition-colors">Kurta Sets</Link></li>
              <li><Link href="/products" className="hover:text-primary transition-colors">Dresses</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Help</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/orders" className="hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link href="/returns" className="hover:text-primary transition-colors">Returns & Refunds</Link></li>
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
          <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a 
              href={settings.instagramUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-pink-600 transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span>Instagram</span>
            </a>
            <a 
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
