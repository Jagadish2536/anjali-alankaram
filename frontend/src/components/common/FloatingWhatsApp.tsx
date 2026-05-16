'use client';
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function FloatingWhatsApp() {
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data?.whatsappNumber) setWhatsappNumber(data.whatsappNumber.replace(/[^0-9]/g, ''));
      } catch (e) {
        console.error('Failed to fetch whatsapp');
      }
    };
    fetchSettings();
  }, []);

  if (!whatsappNumber) return null;

  return (
    <a 
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-[100] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group"
      aria-label="Contact on WhatsApp"
    >
      <MessageCircle className="w-6 h-6 fill-current" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold whitespace-nowrap">
        Chat with us
      </span>
    </a>
  );
}
