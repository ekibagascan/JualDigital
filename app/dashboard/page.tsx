import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { UserDashboard } from "@/components/dashboard/user-dashboard"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <UserDashboard />
      </main>
      <Footer />
    </div>
  )
}
