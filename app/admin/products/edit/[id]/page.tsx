import { AdminLayout } from "@/components/admin/admin-layout"
import { AdminEditProductForm } from "@/components/admin/admin-edit-product-form"

interface AdminEditProductPageProps {
    params: {
        id: string
    }
}

export default function AdminEditProductPage({ params }: AdminEditProductPageProps) {
    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Edit Produk</h1>
                    <p className="text-muted-foreground">
                        Edit informasi produk untuk platform
                    </p>
                </div>
                <AdminEditProductForm productId={params.id} />
            </div>
        </AdminLayout>
    )
} 