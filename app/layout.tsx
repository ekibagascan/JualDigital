import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ClientProviders } from "@/components/providers/client-providers"
import { createSupabaseServerClient } from "@/lib/supabase-server"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Jual Digital - Marketplace Produk Digital Indonesia",
  description:
    "Platform jual beli produk digital terpercaya di Indonesia. Temukan ebook, template, musik, software, dan produk digital lainnya.",
  keywords: "marketplace digital, jual produk digital, ebook indonesia, template design, software",
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    title: "Jual Digital",
    description: "Marketplace produk digital Indonesia",
    images: [{ url: '/og-logo.png', width: 1024, height: 1024, alt: 'Jual Digital' }],
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch user on the server
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="id">
      <body className={inter.className}>
        <ClientProviders initialUser={user}>
          {children}
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  )
}
