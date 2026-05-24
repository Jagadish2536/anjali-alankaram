import type { Metadata } from 'next'
import { Inter, Outfit, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { OAuthProvider } from '@/components/providers/OAuthProvider'
import { MaintenanceProvider } from '@/components/providers/MaintenanceProvider'
import FloatingWhatsApp from '@/components/common/FloatingWhatsApp'

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
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Anjali Alankaram | Premium Women\'s Fashion',
    description: 'Discover the latest trends in women\'s fashion with Anjali Alankaram. Shop elegant ethnic and western wear.',
    images: [{ url: '/favicon.png', width: 200, height: 200, alt: 'Anjali Alankaram Logo' }],
    type: 'website',
    siteName: 'Anjali Alankaram',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} ${outfit.variable} ${cormorant.variable} font-sans min-h-screen flex flex-col`}>
        <OAuthProvider>
          <MaintenanceProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <FloatingWhatsApp />
          </MaintenanceProvider>
        </OAuthProvider>
      </body>
    </html>
  )
}
