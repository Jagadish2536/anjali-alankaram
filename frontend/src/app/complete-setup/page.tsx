'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { Sparkles, Phone, Lock, User as UserIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CompleteSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/profile';
  const { user, isAuthenticated, setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    setName(user.name || '');
    if (user.phone) setPhone(user.phone.replace('+91', ''));
  }, [user, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.put('/users/profile', {
        name: name.trim(),
        phone: cleanPhone,
        password: password,
      });

      setUser(data);
      setSuccess(true);
      setTimeout(() => {
        router.push(returnUrl);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete profile setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-secondary/10 via-background to-accent/15">
      <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
        
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-8 relative">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <h2 className="text-3xl font-outfit font-bold text-foreground tracking-tight">
            Complete Profile Setup
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Just a few more details to secure and activate your account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100 dark:shadow-none">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-outfit font-bold text-xl">Setup Complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">Logging you in now...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-foreground"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground border-r pr-2 mr-2">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className="w-full pl-[4.5rem] pr-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-semibold tracking-wider text-foreground"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Set Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-foreground"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-foreground"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-4 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Completing Setup...
                </>
              ) : (
                'Submit & Start Shopping'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
