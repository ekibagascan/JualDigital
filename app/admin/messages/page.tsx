import { AdminLayout } from "@/components/admin/admin-layout"
import { MessageManagement } from "@/components/admin/message-management"

export default function AdminMessagesPage() {
  return (
    <AdminLayout>
      <MessageManagement />
    </AdminLayout>
  )
}
