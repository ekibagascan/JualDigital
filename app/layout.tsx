import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ClientProviders } from "@/components/providers/client-providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Jual Digital - Marketplace Produk Digital Indonesia",
  description:
    "Platform jual beli produk digital terpercaya di Indonesia. Temukan ebook, template, musik, software, dan produk digital lainnya.",
  keywords: "marketplace digital, jual produk digital, ebook indonesia, template design, software",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <ClientProviders>
          {children}
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  )
}
