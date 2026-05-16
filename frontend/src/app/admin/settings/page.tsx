import { useState } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  Globe, 
  User,
  Save,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState('General');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    storeName: 'Anjali Alankaram',
    supportEmail: 'support@anjalialankaram.com',
    supportPhone: '+91 9876543210',
    currency: 'INR',
    maintenanceMode: false
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const sections = [
    { name: 'General', icon: Settings, desc: 'Store details and contact info.' },
    { name: 'Security', icon: Shield, desc: 'Admin roles and permissions.' },
    { name: 'Notifications', icon: Bell, desc: 'Email and SMS alerts.' },
    { name: 'Payments', icon: CreditCard, desc: 'Razorpay integration.' },
    { name: 'Regional', icon: Globe, desc: 'Tax and shipping settings.' },
    { name: 'Profile', icon: User, desc: 'Your account settings.' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your store configuration and preferences.</p>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200 animate-in fade-in slide-in-from-right-4">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.name;
            return (
              <button 
                key={section.name} 
                onClick={() => setActiveSection(section.name)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                  isActive ? 'bg-white border-primary shadow-md ring-1 ring-primary' : 'bg-white hover:border-primary/50'
                }`}
              >
                <div className={`p-2.5 rounded-xl transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{section.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{section.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2 bg-white border rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-8 border-b pb-4">{activeSection} Settings</h2>
          
          {activeSection === 'General' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Store Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    value={formData.storeName}
                    onChange={e => setFormData({...formData, storeName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Support Email</label>
                    <input 
                      type="email" 
                      className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      value={formData.supportEmail}
                      onChange={e => setFormData({...formData, supportEmail: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Support Phone</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      value={formData.supportPhone}
                      onChange={e => setFormData({...formData, supportPhone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t mt-8">
                <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-xl">
                  <div>
                    <p className="font-bold text-orange-800">Maintenance Mode</p>
                    <p className="text-xs text-orange-700">Disable store access for customers</p>
                  </div>
                  <button 
                    onClick={() => setFormData({...formData, maintenanceMode: !formData.maintenanceMode})}
                    className={`relative w-12 h-6 rounded-full transition-colors ${formData.maintenanceMode ? 'bg-orange-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.maintenanceMode ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <Settings className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-lg">Coming Soon</p>
                <p className="text-sm text-muted-foreground">This settings module is being updated.</p>
              </div>
            </div>
          )}

          <div className="mt-10 flex justify-end">
             <button 
               onClick={handleSave}
               disabled={isSaving}
               className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
             >
               {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
