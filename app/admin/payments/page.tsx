import { AdminLayout } from "@/components/admin/admin-layout"
import { PaymentManagement } from "@/components/admin/payment-management"

export default function AdminPaymentsPage() {
  return (
    <AdminLayout>
      <PaymentManagement />
    </AdminLayout>
  )
}
