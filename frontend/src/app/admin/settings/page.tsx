'use client';
import { 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  Globe, 
  User,
  Save
} from 'lucide-react';

export default function AdminSettingsPage() {
  const sections = [
    { name: 'General', icon: Settings, desc: 'Store details, timezone, and currency.' },
    { name: 'Security', icon: Shield, desc: 'Admin roles and access permissions.' },
    { name: 'Notifications', icon: Bell, desc: 'Order alerts and email templates.' },
    { name: 'Payments', icon: CreditCard, desc: 'Razorpay keys and payout settings.' },
    { name: 'Regional', icon: Globe, desc: 'Tax rates and shipping zones.' },
    { name: 'Profile', icon: User, desc: 'Your personal account settings.' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-outfit font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your store configuration and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button 
              key={section.name} 
              className="flex items-center gap-4 p-6 bg-white border rounded-2xl hover:border-primary hover:shadow-md transition-all text-left group"
            >
              <div className="p-3 bg-muted/20 text-muted-foreground rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg">{section.name}</p>
                <p className="text-sm text-muted-foreground">{section.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border rounded-2xl p-8 max-w-2xl">
        <h2 className="text-xl font-bold mb-6">Store Status</h2>
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <p className="font-medium text-green-800">Your store is currently LIVE</p>
          </div>
          <button className="text-sm font-bold text-green-700 hover:underline">Maintenance Mode</button>
        </div>
        
        <div className="mt-10 flex justify-end">
           <button className="bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
             <Save className="w-5 h-5" /> Save All Changes
           </button>
        </div>
      </div>
    </div>
  );
}
