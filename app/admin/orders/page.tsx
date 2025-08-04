import { AdminLayout } from "@/components/admin/admin-layout"
import { OrderManagementAdmin } from "@/components/admin/order-management-admin"

export default function AdminOrdersPage() {
    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Manajemen Pesanan</h1>
                    <p className="text-muted-foreground">
                        Kelola semua pesanan di platform
                    </p>
                </div>
                <OrderManagementAdmin />
            </div>
        </AdminLayout>
    )
} 