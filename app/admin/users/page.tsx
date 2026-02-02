import { unstable_noStore as noStore } from 'next/cache'
import { AdminLayout } from "@/components/admin/admin-layout"
import { UserManagement } from "@/components/admin/user-management"

export const dynamic = 'force-dynamic'

export default function AdminUsersPage() {
  noStore()
  return (
    <AdminLayout>
      <UserManagement />
    </AdminLayout>
  )
}
