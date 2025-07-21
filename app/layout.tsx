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
  generator: 'v0.dev'
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
