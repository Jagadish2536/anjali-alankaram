'use client';
import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Clock, MessageCircle, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { api } from '@/lib/api';

export default function ContactPage() {
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const phone = settings.supportPhone || '+91 98765 43210';
  const email = settings.contactEmail || settings.supportEmail || 'support@anjalialankaram.com';
  const whatsappNumber = settings.whatsappNumber ? settings.whatsappNumber.replace(/[^0-9]/g, '') : '';
  const storeAddress = settings.storeAddress || 'Anjali Alankaram Boutique\n123 Fashion Avenue, Banjara Hills\nHyderabad, Telangana 500034\nIndia';
  const businessHours = settings.businessHours || 'Monday - Saturday: 10:00 AM - 7:00 PM\nSunday: Closed';

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.message) {
      setStatus('error');
      setStatusMsg('Please fill in your name, email, and message.');
      return;
    }
    setStatus('sending');
    try {
      const { data } = await api.post('/settings/contact', form);
      setStatus('success');
      setStatusMsg(data.message || 'Your message has been sent!');
      setForm({ firstName: '', lastName: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
      setStatusMsg('Something went wrong. Please try again or contact us directly.');
    }
  };

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

          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-700">Message Sent!</h3>
              <p className="text-muted-foreground text-sm max-w-xs">{statusMsg}</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-2 text-sm font-bold text-primary hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    className="w-full h-12 px-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                    className="w-full h-12 px-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange('email')}
                  className="w-full h-12 px-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={handleChange('subject')}
                  placeholder="e.g. Order query, Product info..."
                  className="w-full h-12 px-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message *</label>
                <textarea
                  rows={5}
                  required
                  value={form.message}
                  onChange={handleChange('message')}
                  className="w-full p-4 bg-muted/20 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {statusMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-primary text-primary-foreground h-14 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {status === 'sending' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</>
                ) : 'Send Message'}
              </button>
            </form>
          )}
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
                <h3 className="font-bold text-lg mb-1">Store Address</h3>
                <p className="text-muted-foreground whitespace-pre-line">{storeAddress}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Business Hours</h3>
                {businessHours.split('\n').map((line, i) => (
                  <p key={i} className="text-muted-foreground">{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
