import { AdminLayout } from "@/components/admin/admin-layout"
import { AnnouncementManagement } from "@/components/admin/announcement-management"

export default function AdminAnnouncementsPage() {
  return (
    <AdminLayout>
      <AnnouncementManagement />
    </AdminLayout>
  )
}
