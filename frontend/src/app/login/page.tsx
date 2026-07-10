'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { Loader2, Mail, Lock, Phone, User as UserIcon, ShieldCheck } from 'lucide-react';

function LoginContent({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  
  const { setTokens, setUser } = useAuthStore();
  
  const redirectAfterLogin = (userObj: any, defaultUrl: string) => {
    let targetUrl = defaultUrl;
    if (targetUrl === '/profile' || targetUrl === '/admin' || targetUrl === '/admin/') {
      if (['ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER', 'STOCK_MANAGER', 'WAREHOUSE_STAFF'].includes(userObj.role)) {
        targetUrl = '/';
      }
    }
    router.push(targetUrl);
  };
  
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'OTP' | 'FORGOT_PASSWORD'>('LOGIN');
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'RESET'>('REQUEST');
  
  // Field states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  
  // Forgot Password states
  const [forgotEmailOrPhone, setForgotEmailOrPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  
  // OTP flow step
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reset error when switching mode
  const handleModeChange = (newMode: 'LOGIN' | 'REGISTER' | 'OTP' | 'FORGOT_PASSWORD') => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
    setStep('EMAIL');
    setForgotStep('REQUEST');
    setForgotEmailOrPhone('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setOtpEmail('');
  };

  // Submit Forgot Password Request (OTP request)
  const handleForgotPasswordRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmailOrPhone.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data } = await api.post('/auth/forgot-password/request', {
        emailOrPhone: forgotEmailOrPhone.trim(),
      });
      setSuccessMessage(data.message || 'Verification code sent successfully');
      setForgotStep('RESET');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Forgot Password Reset
  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || !forgotNewPassword || !forgotConfirmPassword) {
      setError('All fields are required');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data } = await api.post('/auth/forgot-password/reset', {
        emailOrPhone: forgotEmailOrPhone.trim(),
        code: forgotOtp,
        password: forgotNewPassword,
      });
      setSuccessMessage(data.message || 'Password reset successfully! Please sign in with your new password.');
      setMode('LOGIN');
      setForgotEmailOrPhone('');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 400 || status === 401 || (msg && (msg.toLowerCase().includes('code') || msg.toLowerCase().includes('otp')))) {
        setError('OTP was incorrect. Please try again or resend OTP.');
      } else {
        setError(msg || 'Failed to reset password. Please check your OTP and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Password-based Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
      });
      
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      redirectAfterLogin(data.user, returnUrl);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Login failed. Please check your credentials.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const { data } = await api.post('/auth/register', {
        name: name || undefined,
        email,
        phone: phone || undefined,
        password,
      });
      
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      redirectAfterLogin(data.user, returnUrl);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Send OTP
  // Submit Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.post('/auth/otp/send', { email: otpEmail.trim() });
      setStep('OTP');
      setSuccessMessage('OTP sent successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const { data } = await api.post('/auth/otp/verify', { 
        email: otpEmail.trim(), 
        code: otp 
      });
      
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      redirectAfterLogin(data.user, returnUrl);
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 400 || status === 401 || (msg && (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('code')))) {
        setError('OTP was incorrect. Please try again or resend OTP.');
      } else {
        setError(msg || 'Invalid OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Handlers
  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google', {
        idToken: credentialResponse.credential,
      });
      
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      if (data.requireSetup) {
        router.push(`/complete-setup?returnUrl=${encodeURIComponent(returnUrl || '/')}`);
      } else {
        redirectAfterLogin(data.user, returnUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    setError('Google Login was unsuccessful. Please try again.');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-secondary/20 via-background to-accent/10">
      <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-3xl p-8 shadow-sm relative overflow-hidden">
        
        {/* Decorative background gradients */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-8 relative">
          <h2 className="text-3xl font-outfit font-bold text-foreground tracking-tight">
            {mode === 'LOGIN' && 'Welcome Back'}
            {mode === 'REGISTER' && 'Create Account'}
            {mode === 'OTP' && 'Quick Sign In'}
            {mode === 'FORGOT_PASSWORD' && 'Reset Password'}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === 'LOGIN' && 'Sign in to access your wishlist, orders, and cart'}
            {mode === 'REGISTER' && 'Join Anjali Alankaram to start shopping'}
            {mode === 'OTP' && 'Sign in securely via one-time email OTP verification'}
            {mode === 'FORGOT_PASSWORD' && (forgotStep === 'REQUEST' ? 'Enter email address to receive reset OTP' : 'Enter reset code and new password')}
          </p>
        </div>

        {/* Tab Switcher */}
        {mode !== 'FORGOT_PASSWORD' && (
          <div className="flex bg-muted p-1 rounded-2xl mb-8 border border-border">
            <button
              onClick={() => handleModeChange('LOGIN')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'LOGIN'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleModeChange('REGISTER')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'REGISTER'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => handleModeChange('OTP')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'OTP'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              OTP Login
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium border border-red-200 flex items-start gap-2.5">
            <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-medium border border-emerald-500/20 flex items-start gap-2.5 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* --- MODE: LOGIN (Email / Password) --- */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Email Address or Phone
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="login-email"
                  type="text"
                  required
                  placeholder="name@example.com"
                  className="w-full h-13 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('FORGOT_PASSWORD');
                    setForgotStep('REQUEST');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-semibold text-primary hover:text-primary/85 hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full h-13 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-13 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>
        )}

        {/* --- MODE: REGISTER (Name, Email, Phone, Password) --- */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <UserIcon className="w-5 h-5" />
                </span>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="John Doe"
                  className="w-full h-12 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full h-12 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Phone Number (Optional)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-muted-foreground font-semibold text-sm">+91</span>
                <input
                  id="reg-phone"
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit phone number"
                  className="w-full h-12 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  id="reg-password"
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  className="w-full h-12 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-13 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm mt-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </button>
          </form>
        )}

        {/* --- MODE: OTP (Email / OTP input) --- */}
        {mode === 'OTP' && (
          <div>
            {step === 'EMAIL' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label htmlFor="otp-email" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-muted-foreground">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      id="otp-email"
                      type="email"
                      required
                      className="w-full h-13 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                      placeholder="name@example.com"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !otpEmail}
                  className="w-full h-13 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="otp-code" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider font-outfit">
                      Enter OTP Code
                    </label>
                    <div className="flex gap-2.5 items-center">
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        className="text-xs text-primary hover:underline font-semibold"
                      >
                        Resend OTP
                      </button>
                      <span className="text-muted-foreground/30 text-xs">|</span>
                      <button
                        type="button"
                        onClick={() => setStep('EMAIL')}
                        className="text-xs text-primary hover:underline font-semibold"
                      >
                        Change Email
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Sent code to email address {otpEmail}
                  </p>
                  <input
                    id="otp-code"
                    type="text"
                    required
                    maxLength={6}
                    className="w-full h-13 px-4 text-center tracking-[0.5em] text-lg font-bold bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground placeholder:text-muted-foreground/40"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length < 4}
                  className="w-full h-13 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Sign In'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* --- MODE: FORGOT_PASSWORD --- */}
        {mode === 'FORGOT_PASSWORD' && (
          <div>
            {forgotStep === 'REQUEST' ? (
              <form onSubmit={handleForgotPasswordRequest} className="space-y-5">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Email Address or WhatsApp Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-muted-foreground">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      id="forgot-email"
                      type="text"
                      required
                      placeholder="name@example.com or 10-digit WhatsApp number"
                      className="w-full h-13 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                      value={forgotEmailOrPhone}
                      onChange={(e) => setForgotEmailOrPhone(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-13 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Code'}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => handleModeChange('LOGIN')}
                    className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotPasswordReset} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Target Identifier
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotStep('REQUEST')}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Change
                    </button>
                  </div>
                  <input
                    type="text"
                    disabled
                    className="w-full h-11 px-4 bg-muted/50 border border-input rounded-xl text-muted-foreground text-sm outline-none cursor-not-allowed"
                    value={forgotEmailOrPhone}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="forgot-otp" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Enter OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={() => handleForgotPasswordRequest()}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Resend OTP
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-muted-foreground">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    <input
                      id="forgot-otp"
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      className="w-full h-12 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground font-bold text-center tracking-[0.2em] placeholder:text-muted-foreground/40"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="forgot-new-password" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-muted-foreground">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="forgot-new-password"
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      className="w-full h-12 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="forgot-confirm-password" className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-muted-foreground">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="forgot-confirm-password"
                      type="password"
                      required
                      placeholder="Repeat new password"
                      className="w-full h-12 pl-12 pr-4 bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-13 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm mt-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => handleModeChange('LOGIN')}
                    className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    Cancel and Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Separator / Google Login */}
        {mode !== 'FORGOT_PASSWORD' && (
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-card text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                shape="rectangular"
                size="large"
                text="continue_with"
                width="320"
              />
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground leading-relaxed">
          By continuing, you agree to Anjali Alankaram's <br/>
          <Link href="/terms" className="underline hover:text-primary transition-colors">Terms of Service</Link> and{' '}
          <Link href="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function SearchParamsReader({ onReady }: { onReady: (returnUrl: string) => void }) {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/profile';
  // Pass up on first render only
  if (typeof window !== 'undefined') onReady(returnUrl);
  return null;
}

export default function LoginPage() {
  const [returnUrl, setReturnUrl] = useState('/profile');
  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsReader onReady={setReturnUrl} />
      </Suspense>
      <LoginContent returnUrl={returnUrl} />
    </>
  );
}
