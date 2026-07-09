'use client';

import React, { useState, useEffect } from 'react';
import { OptimizedImage } from '../common/OptimizedImage';

export const AppDownloadSection: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [shouldHide, setShouldHide] = useState(true);

  useEffect(() => {
    const isAndroidApp = window.navigator.userAgent.includes('AnjaliAlankaramAndroidApp');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isAndroidApp || isStandalone) {
      setShouldHide(true);
    } else {
      setShouldHide(false);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  if (shouldHide) return null;

  return (
    <section className="py-16 px-4 bg-muted/30 border-y border-primary/5" aria-labelledby="app-download-heading">
      <div className="max-w-6xl mx-auto bg-gradient-to-br from-primary to-primary/90 rounded-3xl overflow-hidden shadow-xl text-white">
        <div className="flex flex-col md:flex-row items-center justify-between p-8 md:p-14 gap-8">
          
          {/* Left Column: Description & Actions */}
          <div className="flex-1 space-y-6 max-w-xl text-left">
            <span className="inline-block bg-white/10 backdrop-blur-md text-white/90 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-white/10">
              Anjali Alankaram Mobile
            </span>
            <h2 id="app-download-heading" className="font-cormorant text-3xl md:text-5xl font-bold leading-tight">
              Bring Luxury Fashion to Your Fingertips
            </h2>
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              Experience the absolute best of Anjali Alankaram. Download our Android mobile app or install our Web PWA for exclusive collections, instant order tracking, fast checkout, and members-only BOGO offers.
            </p>

            <div className="flex flex-col gap-4 pt-2 w-full text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                
                {/* Android: Direct APK Download */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-outfit">Android Users</h4>
                    <p className="text-[11px] text-white/70 mt-1">Download and install our mobile app directly onto your Android device.</p>
                  </div>
                  <a
                    href="/AnjaliAlankaram.apk"
                    download="AnjaliAlankaram.apk"
                    className="flex items-center justify-center gap-3 bg-black/80 hover:bg-black/95 px-5 py-2.5 rounded-xl border border-white/10 transition-all active:scale-95 group shadow-md w-full cursor-pointer"
                  >
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 0 1-.399-1.284V3.098c0-.495.18-.956.4-1.284zm11.238 9.133l2.84 2.84L5.617 21.03l9.23-10.083zM18.8 12.502l3.414-1.972a1.004 1.004 0 0 0 0-1.74l-3.414-1.972-2.316 2.317 2.316 2.367zm-3.953-1.635L5.617 2.97l12.07 7.247-2.84 2.65z"/>
                    </svg>
                    <div className="text-left">
                      <p className="text-[9px] text-white/60 uppercase font-semibold leading-none">Get it on</p>
                      <p className="text-sm font-bold leading-tight mt-0.5">Direct APK Download</p>
                    </div>
                  </a>
                </div>

                {/* iOS: Safari Instructions */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-outfit">iOS Users</h4>
                    <p className="text-[11px] text-white/70 mt-1">Install on iPhone/iPad to run from your Home Screen.</p>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-left w-full">
                    <p className="text-[10px] text-white/95 leading-relaxed">
                      Open site in <span className="font-semibold text-white">Safari</span> ➔ tap <span className="font-semibold text-white">three dots</span> / <span className="font-semibold text-white">Share</span> menu ➔ select <span className="font-semibold text-white">Share / View More</span> ➔ tap <span className="font-semibold text-white">Add to Home Screen</span>.
                    </p>
                  </div>
                </div>

              </div>

              {/* Desktop / PWA Install Option */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-outfit">Desktop Users</h4>
                  <p className="text-[11px] text-white/70 mt-1">
                    Press the install icon in your browser's address bar (top right) or click the install button.
                  </p>
                </div>
                {isInstallable ? (
                  <button
                    onClick={handleInstallClick}
                    className="bg-white text-primary hover:bg-white/95 text-xs font-bold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
                  >
                    <svg className="w-4 h-4 text-primary fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Install App</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-white/40 italic font-medium shrink-0">App already installed / PWA active</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mockup */}
          <div className="relative shrink-0 w-64 md:w-80 h-72 md:h-96 flex items-center justify-center">
            <div className="absolute w-56 md:w-72 h-56 md:h-72 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute w-40 h-40 rounded-full bg-amber-400/10 blur-2xl" />

            <div className="relative w-44 md:w-56 aspect-[9/18.5] bg-neutral-900 rounded-[36px] p-2.5 shadow-2xl border-4 border-neutral-800 rotate-[4deg] transition-all hover:rotate-[2deg] duration-500 overflow-hidden">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
              </div>
              
              <div className="relative w-full h-full bg-white rounded-[26px] overflow-hidden flex flex-col pt-4">
                <div className="px-3 py-1 flex items-center justify-between border-b shrink-0 bg-primary text-white">
                  <span className="text-[10px] font-bold tracking-widest font-outfit uppercase">ANJALI</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                
                <div className="flex-1 p-2 space-y-2.5 overflow-hidden select-none bg-gray-50/50">
                  <div className="bg-primary/5 rounded-lg p-2 text-center border border-primary/10">
                    <p className="text-[9px] font-bold text-primary">FESTIVE EDIT</p>
                    <p className="text-[7px] text-muted-foreground mt-0.5">Shop Silk Sarees & Gowns</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white rounded-md p-1 border shadow-xs">
                      <div className="relative aspect-[3/4] bg-muted rounded-xs overflow-hidden">
                        <OptimizedImage src="/placeholder.png" alt="ethnic" fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="h-1 bg-gray-200 w-3/4 rounded mt-1.5" />
                      <div className="h-1 bg-gray-200 w-1/4 rounded mt-1" />
                    </div>
                    <div className="bg-white rounded-md p-1 border shadow-xs">
                      <div className="relative aspect-[3/4] bg-muted rounded-xs overflow-hidden">
                        <OptimizedImage src="/placeholder.png" alt="designer" fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="h-1 bg-gray-200 w-3/4 rounded mt-1.5" />
                      <div className="h-1 bg-gray-200 w-1/4 rounded mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
