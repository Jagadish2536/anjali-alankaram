import type { Metadata, Viewport } from 'next'
import { Inter, Outfit, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import { OAuthProvider } from '@/components/providers/OAuthProvider'
import { MaintenanceProvider } from '@/components/providers/MaintenanceProvider'
import VisitorTracker from '@/components/VisitorTracker'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Anjali Alankaram | Premium Women\'s Fashion',
  description: 'Discover the latest trends in women\'s fashion with Anjali Alankaram. Shop elegant ethnic and western wear — Sarees, Lehengas, Kurtis, Gowns and more.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  appleWebApp: {
    title: 'Anjali Alankaram',
    statusBarStyle: 'black-translucent',
    startupImage: '/favicon.png',
  },
  openGraph: {
    title: 'Anjali Alankaram | Premium Women\'s Fashion',
    description: 'Discover the latest trends in women\'s fashion with Anjali Alankaram. Shop elegant ethnic and western wear.',
    images: [{ url: '/favicon.png', width: 200, height: 200, alt: 'Anjali Alankaram Logo' }],
    type: 'website',
    siteName: 'Anjali Alankaram',
  },
  // Modern PWA capability meta — replaces deprecated apple-mobile-web-app-capable
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  // Use modern PWA capability meta (replaces deprecated apple-mobile-web-app-capable)
  themeColor: '#8B0030',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} ${outfit.variable} ${cormorant.variable} font-sans min-h-screen flex flex-col overflow-x-hidden`}>
        <OAuthProvider>
          <MaintenanceProvider>
            <ServiceWorkerRegistration />
            <VisitorTracker />
            <Navbar />
            {/* pb-16 on mobile so content isn't hidden behind bottom nav */}
            <main className="flex-1 pb-16 md:pb-0">
              {children}
            </main>
            {/* Hide footer on mobile — bottom nav replaces it */}
            <div className="hidden md:block">
              <Footer />
            </div>
            {/* Mobile-only collapsible footer */}
            <div className="md:hidden pb-16">
              <Footer />
            </div>
            <MobileBottomNav />
          </MaintenanceProvider>
        </OAuthProvider>
      </body>
    </html>
  )
}
