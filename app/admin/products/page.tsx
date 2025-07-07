import { AdminLayout } from "@/components/admin/admin-layout"
import { ProductManagementAdmin } from "@/components/admin/product-management-admin"

export default function AdminProductsPage() {
  return (
    <AdminLayout>
      <ProductManagementAdmin />
    </AdminLayout>
  )
}
