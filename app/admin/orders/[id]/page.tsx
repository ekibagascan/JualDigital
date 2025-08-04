import { AdminLayout } from "@/components/admin/admin-layout"
import { AdminOrderDetail } from "@/components/admin/admin-order-detail"

interface AdminOrderDetailPageProps {
    params: {
        id: string
    }
}

export default function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Detail Pesanan</h1>
                    <p className="text-muted-foreground">
                        Lihat detail lengkap pesanan
                    </p>
                </div>
                <AdminOrderDetail orderId={params.id} />
            </div>
        </AdminLayout>
    )
} 