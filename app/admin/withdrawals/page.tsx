import { AdminLayout } from "@/components/admin/admin-layout"
import { WithdrawalManagementAdmin } from "@/components/admin/withdrawal-management-admin"

export default function AdminWithdrawalsPage() {
  return (
    <AdminLayout>
      <WithdrawalManagementAdmin />
    </AdminLayout>
  )
}
