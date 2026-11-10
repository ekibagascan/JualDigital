import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { DeleteAccountForm } from "@/components/account/delete-account-form"

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Hapus akun</h1>
            <p className="text-muted-foreground">
              Hapus akun Jual Digital Anda beserta data pribadi yang tersimpan di akun itu.
            </p>
          </div>
          <DeleteAccountForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
