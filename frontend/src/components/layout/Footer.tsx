'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Instagram, MessageCircle, Mail, Phone, RotateCcw, Shield, FileText } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function Footer() {
  const { settings, fetchSettings } = useSettingsStore();
  const s = settings as any;

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Dynamic footer categories from admin settings, fallback to static
  const footerCategories: { name: string; slug: string }[] = s.footerCategories || [
    { name: 'New Arrivals', slug: 'new' },
    { name: 'Sarees', slug: 'sarees' },
    { name: 'Kurta Sets', slug: 'kurta-sets' },
    { name: 'Dresses', slug: 'dresses' },
  ];

  const returnDays = s.returnPolicyDays ?? 7;
  const contactEmail = s.contactEmail || s.supportEmail || '';
  const contactPhone = s.contactPhone || s.supportPhone || '';
  const storeDesc = s.storeDescription || 'Premium women\'s fashion celebrating the elegance of Indian and modern aesthetics.';
  const instagramUrl = s.instagramUrl || '#';
  const whatsappNumber = (s.whatsappNumber || '').replace(/[^0-9]/g, '');
  const storeName = s.storeName || 'Anjali Alankaram';

  return (
    <footer className="border-t bg-muted/40 mt-20">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="space-y-4">
            <h3 className="font-outfit text-xl font-bold text-primary">{storeName}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{storeDesc}</p>
            {/* Return policy badge */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 border border-primary/10 rounded-xl px-3 py-2 w-fit">
              <RotateCcw className="w-4 h-4 text-primary" />
              <span className="font-semibold">{returnDays}-Day Easy Returns</span>
            </div>
            {/* Contact */}
            <div className="space-y-2">
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="w-4 h-4 shrink-0" /> {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-4 h-4 shrink-0" /> {contactPhone}
                </a>
              )}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {footerCategories.map(cat => (
                <li key={cat.slug}>
                  <Link
                    href={cat.slug.startsWith('/') ? cat.slug : `/products?category=${cat.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-semibold mb-4">Help</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/track-order" className="hover:text-primary transition-colors">Track Order</Link></li>
              <li>
                <Link href="/returns" className="hover:text-primary transition-colors flex items-center gap-1">
                  Returns &amp; Refunds
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">{returnDays}d</span>
                </Link>
              </li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              {contactPhone && (
                <li>
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-green-600 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" /> Chat on WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Legal + Trust Badges */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary transition-colors flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Terms of Service</Link></li>
            </ul>

            {/* Trust Badges */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                <span>100% Secure Payments</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5 text-primary" />
                <span>{returnDays}-Day Return Policy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <div className="flex gap-5">
            {instagramUrl && instagramUrl !== '#' && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-pink-600 transition-colors">
                <Instagram className="w-4 h-4" /> Instagram
              </a>
            )}
            {whatsappNumber && (
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-green-600 transition-colors">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
            {contactEmail && (
              <a href={`mailto:${contactEmail}`}
                className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Mail className="w-4 h-4" /> Email
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
