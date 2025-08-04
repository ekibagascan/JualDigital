"use client"

import { OrderManagement } from "@/components/seller/order-management"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function SellerOrdersPage() {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <OrderManagement />
            </main>
            <Footer />
        </div>
    )
} 