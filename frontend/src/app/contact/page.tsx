'use client';
import { useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function ContactPage() {
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const phone = settings.supportPhone || '+91 98765 43210';
  const email = settings.supportEmail || 'support@anjalialankaram.com';
  const whatsappNumber = settings.whatsappNumber ? settings.whatsappNumber.replace(/[^0-9]/g, '') : '';

  return (
    <div className="container py-12 max-w-6xl">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-outfit font-bold mb-4">Get in Touch</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Have a question about a product, your order, or our policies? We're here to help. Reach out to us using any of the methods below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Form */}
        <div className="bg-white border rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <input type="text" className="w-full h-12 px-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <input type="text" className="w-full h-12 px-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input type="email" className="w-full h-12 px-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input type="text" className="w-full h-12 px-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea rows={5} className="w-full p-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
            </div>
            <button type="button" className="w-full bg-primary text-primary-foreground h-14 rounded-xl font-bold hover:bg-primary/90 transition-colors">
              Send Message
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="space-y-8">
          <div className="bg-primary/5 border border-primary/10 rounded-3xl p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Customer Care</h3>
                <p className="text-muted-foreground mb-3">Call or WhatsApp us for instant support.</p>
                <div className="flex flex-wrap gap-3">
                  <a href={`tel:${phone}`} className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-primary/20 text-sm font-bold text-primary hover:bg-primary/5 transition-colors">
                    <Phone className="w-4 h-4" /> {phone}
                  </a>
                  {whatsappNumber && (
                    <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#20ba56] transition-colors shadow-sm shadow-[#25D366]/20">
                      <MessageCircle className="w-4 h-4 fill-current" /> Chat with Us
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Email Support</h3>
                <p className="text-muted-foreground mb-2">Drop us a line and we'll reply within 24 hours.</p>
                <a href={`mailto:${email}`} className="text-primary hover:underline font-medium">{email}</a>
              </div>
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Studio Address</h3>
                <p className="text-muted-foreground">
                  Anjali Alankaram Boutique<br/>
                  123 Fashion Avenue, Banjara Hills<br/>
                  Hyderabad, Telangana 500034<br/>
                  India
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Business Hours</h3>
                <p className="text-muted-foreground">Monday - Saturday: 10:00 AM - 7:00 PM</p>
                <p className="text-muted-foreground">Sunday: Closed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
