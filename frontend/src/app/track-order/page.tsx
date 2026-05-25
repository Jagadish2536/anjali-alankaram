import Link from 'next/link';
import { Truck, Package, CheckCircle2 } from 'lucide-react';

export default function TrackOrderPage() {
  return (
    <div className="container py-20 max-w-2xl">
      <div className="text-center mb-10">
        <Truck className="w-16 h-16 mx-auto text-primary mb-4" />
        <h1 className="text-4xl font-outfit font-bold mb-4">Track Your Order</h1>
        <p className="text-muted-foreground text-lg">Enter your Order ID or AWB number to check the delivery status.</p>
      </div>

      <div className="bg-white border rounded-2xl p-8 shadow-sm">
        <form className="space-y-6">
          <div>
            <label className="block font-medium mb-2">Order ID or Tracking Number</label>
            <input 
              type="text" 
              placeholder="e.g. ORD-12345 or AWB-98765"
              className="w-full h-14 px-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block font-medium mb-2">Registered Email or WhatsApp Number</label>
            <input 
              type="text" 
              placeholder="Enter email or WhatsApp number"
              className="w-full h-14 px-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <button type="button" className="w-full bg-primary text-primary-foreground h-14 rounded-xl font-bold hover:bg-primary/90 transition-colors">
            Track Now
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Logged in users can track orders directly from their <Link href="/profile" className="text-primary hover:underline font-medium">Profile</Link>.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <div className="bg-muted/20 p-6 rounded-xl flex gap-4">
          <Package className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h3 className="font-bold mb-1">Standard Delivery</h3>
            <p className="text-sm text-muted-foreground">Usually takes 5-7 business days after dispatch.</p>
          </div>
        </div>
        <div className="bg-muted/20 p-6 rounded-xl flex gap-4">
          <CheckCircle2 className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h3 className="font-bold mb-1">Assured Updates</h3>
            <p className="text-sm text-muted-foreground">We send WhatsApp and Email updates at every step.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
