import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProfileSettings } from "@/components/profile/profile-settings"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Pengaturan Profil</h1>
            <p className="text-muted-foreground">Kelola informasi akun dan preferensi Anda</p>
          </div>
          <ProfileSettings />
        </div>
      </main>
      <Footer />
    </div>
  )
}
