'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function FloatingWhatsApp() {
  const pathname = usePathname();
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (pathname.startsWith('/admin')) {
    return null;
  }

  const number = settings.whatsappNumber.replace(/[^0-9]/g, '');
  if (!number) return null;

  return (
    <a 
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-[180px] md:bottom-6 right-4 md:right-6 z-[60] bg-[#25D366] text-white p-3.5 md:p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group"
      aria-label="Contact on WhatsApp"
    >
      <MessageCircle className="w-5 h-5 md:w-6 md:h-6 fill-current" />
      <span className="hidden md:block max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold whitespace-nowrap">
        Chat with us
      </span>
    </a>
  );
}
