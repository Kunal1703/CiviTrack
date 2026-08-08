import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Navbar } from '@/components/navbar'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from './providers'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: {
    default: 'CiviTrack AI — Intelligent Urban Complaint Management',
    template: '%s | CiviTrack AI',
  },
  description:
    'AI-powered civic complaint management. Report issues and let CiviTrack AI classify, prioritize, and route them in real time.',
  keywords: ['civic', 'AI', 'smart city', 'complaints', 'classification', 'urban', 'analytics'],
  authors: [{ name: 'CiviTrack AI' }],
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased min-h-screen flex flex-col bg-background text-foreground">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Toaster richColors position="top-center" />
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
