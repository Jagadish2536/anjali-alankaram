'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Instagram, MessageCircle, Mail, Phone, ArrowUp, ChevronDown } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { api } from '@/lib/api';

// Damask / fleur-de-lis SVG pattern as data URI
const damaskBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.6' opacity='0.12'%3E%3Cellipse cx='40' cy='20' rx='6' ry='10'/%3E%3Cellipse cx='40' cy='60' rx='6' ry='10'/%3E%3Cellipse cx='20' cy='40' rx='10' ry='6'/%3E%3Cellipse cx='60' cy='40' rx='10' ry='6'/%3E%3Ccircle cx='40' cy='40' r='5'/%3E%3Cpath d='M40 10 C35 15 32 22 32 28 C32 34 35 38 40 40 C45 38 48 34 48 28 C48 22 45 15 40 10Z'/%3E%3Cpath d='M40 70 C35 65 32 58 32 52 C32 46 35 42 40 40 C45 42 48 46 48 52 C48 58 45 65 40 70Z'/%3E%3Cpath d='M10 40 C15 35 22 32 28 32 C34 32 38 35 40 40 C38 45 34 48 28 48 C22 48 15 45 10 40Z'/%3E%3Cpath d='M70 40 C65 35 58 32 52 32 C46 32 42 35 40 40 C42 45 46 48 52 48 C58 48 65 45 70 40Z'/%3E%3C/g%3E%3C/svg%3E")`;

const HELP_LINKS = [
  { name: 'Contact Us', href: '/contact' },
  { name: 'Track Order', href: '/track-order' },
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Shipping Policy', href: '/shipping' },
  { name: 'Terms of Service', href: '/terms' },
];

const DISCOVER_LINKS = [
  { name: 'About Us', href: '/contact' },
  { name: 'Shop', href: '/products' },
  { name: 'My Account', href: '/profile' },
];

// ── Mobile-collapsible footer section ─────────────────────────────────────────
function FooterAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {/* Desktop: always-visible heading */}
      <h4 className="hidden md:block font-outfit text-sm font-semibold text-white uppercase tracking-widest mb-5">{title}</h4>
      {/* Mobile: tap to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        className="md:hidden w-full flex items-center justify-between py-4 border-b border-white/10 text-white font-semibold text-sm"
      >
        {title}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`md:block ${open ? 'block pt-4 pb-2' : 'hidden'}`}>
        {children}
      </div>
    </div>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const { settings, fetchSettings } = useSettingsStore();
  const s = settings as any;
  const [footerCats, setFooterCats] = useState<{ name: string; slug: string }[]>([]);

  useEffect(() => {
    fetchSettings();
    // Fetch live categories so footer matches actual catalogue
    api.get('/categories').then(({ data }) => {
      const list: any[] = Array.isArray(data) ? data : data?.data || [];
      if (list.length > 0) {
        setFooterCats(list.map((c: any) => ({ name: c.name, slug: c.slug })));
      }
    }).catch(() => {});
  }, [fetchSettings]);

  if (pathname.startsWith('/admin')) {
    return null;
  }

  const storeName = s.storeName || 'Anjali Alankaram';
  const storeDesc = s.storeDescription || `Shop Sarees, Lehengas, Kurtis, Gowns, Kids Wear, Stretchable Blouses & Jewellery — All in One Place at ${storeName}`;
  const instagramUrl = s.instagramUrl || 'https://instagram.com/jagadishvarma99';
  const whatsappNumber = (s.whatsappNumber || '7032492775').replace(/[^0-9]/g, '');
  const contactEmail = s.contactEmail || s.supportEmail || 'jagadishvarma99@gmail.com';
  const contactPhone = s.contactPhone || s.supportPhone || '+91 7032492775';
  // Use live categories from API, fallback to settings footerCategories
  const footerCategories: { name: string; slug: string }[] = footerCats.length > 0
    ? footerCats
    : (s.footerCategories?.length ? s.footerCategories : []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: 'hsl(345, 80%, 28%)', backgroundImage: damaskBg, backgroundSize: '80px 80px' }}
    >
      {/* Main columns */}
      <div className="container py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 md:gap-10">

          {/* Brand */}
          <div className="space-y-4">
            {/* Logo mark */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full border border-white/30 overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                <Image src="/logo.png" alt={storeName} fill className="object-contain" />
              </div>
              <div>
                <p className="font-cormorant text-xl font-bold text-white leading-none">{storeName}</p>
                <p className="text-white/50 text-[10px] tracking-[0.2em] uppercase font-outfit">EST. 2024</p>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{storeDesc}</p>

            {/* Social */}
            <div className="flex gap-3 pt-1">
              {instagramUrl && instagramUrl !== '#' && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Instagram">
                  <Instagram className="w-4 h-4 text-white" />
                </a>
              )}
              {whatsappNumber && (
                <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="WhatsApp">
                  <MessageCircle className="w-4 h-4 text-white" />
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Email">
                  <Mail className="w-4 h-4 text-white" />
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Phone">
                  <Phone className="w-4 h-4 text-white" />
                </a>
              )}
            </div>
          </div>

          {/* Categories — collapsible on mobile, always open on desktop */}
          {footerCategories.length > 0 && (
            <FooterAccordion title="Categories">
              <ul className="space-y-3">
                {footerCategories.map(cat => (
                  <li key={cat.slug}>
                    <Link href={`/products?category=${cat.slug}`} className="text-white/60 hover:text-white text-sm transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterAccordion>
          )}

          {/* Help */}
          <FooterAccordion title="Help">
            <ul className="space-y-3">
              {HELP_LINKS.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/60 hover:text-white text-sm transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </FooterAccordion>

          {/* Discover */}
          <FooterAccordion title="Discover">
            <ul className="space-y-3">
              {DISCOVER_LINKS.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/60 hover:text-white text-sm transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </FooterAccordion>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-white/40">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>© {new Date().getFullYear()} {storeName}. All rights reserved.</span>
            <span className="text-white/20 hidden sm:inline">|</span>
            {whatsappNumber && (
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer"
                className="hover:text-white/70 transition-colors flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </a>
            )}
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="hover:text-white/70 transition-colors">
                {contactEmail}
              </a>
            )}
          </div>
          <div className="flex flex-col items-center sm:items-end gap-1">
            <div className="flex items-center gap-2">
              <a href="https://instagram.com/jagadishvarma99" target="_blank" rel="noopener noreferrer"
                className="hover:text-white/70 transition-colors flex items-center gap-1">
                <Instagram className="w-3.5 h-3.5" /> @jagadishvarma99
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to top — above bottom nav on mobile */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-[130px] md:bottom-6 right-4 md:right-6 z-40 w-10 h-10 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-0.5"
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </footer>
  );
}
