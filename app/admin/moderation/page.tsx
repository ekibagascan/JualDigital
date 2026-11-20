import { AdminLayout } from "@/components/admin/admin-layout"
import { ModerationQueue } from "@/components/admin/moderation-queue"

export const dynamic = "force-dynamic"

export default function AdminModerationPage() {
  return (
    <AdminLayout>
      <ModerationQueue />
    </AdminLayout>
  )
}
