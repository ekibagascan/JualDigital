import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Syarat & Ketentuan</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground mb-8">Terakhir diperbarui: 1 Januari 2024</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Penerimaan Syarat</h2>
              <p className="mb-4">
                Dengan mengakses dan menggunakan platform Jual Digital, Anda menyetujui untuk terikat dengan syarat dan
                ketentuan ini. Jika Anda tidak menyetujui syarat ini, mohon untuk tidak menggunakan layanan kami.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Definisi</h2>
              <ul className="list-disc pl-6 mb-4">
                <li>
                  <strong>Platform:</strong> Website dan aplikasi Jual Digital
                </li>
                <li>
                  <strong>Pengguna:</strong> Setiap orang yang menggunakan platform kami
                </li>
                <li>
                  <strong>Penjual:</strong> Pengguna yang menjual produk digital di platform
                </li>
                <li>
                  <strong>Pembeli:</strong> Pengguna yang membeli produk digital di platform
                </li>
                <li>
                  <strong>Produk Digital:</strong> Konten digital yang dijual melalui platform
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Akun Pengguna</h2>
              <p className="mb-4">
                Untuk menggunakan layanan tertentu, Anda harus membuat akun. Anda bertanggung jawab untuk:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Menjaga kerahasiaan informasi akun Anda</li>
                <li>Memberikan informasi yang akurat dan terkini</li>
                <li>Memberitahu kami jika terjadi penggunaan akun yang tidak sah</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Aturan untuk Penjual</h2>
              <p className="mb-4">Sebagai penjual di platform kami, Anda setuju untuk:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Menjual hanya produk digital yang legal dan tidak melanggar hak cipta</li>
                <li>Memberikan deskripsi produk yang akurat</li>
                <li>Menyediakan dukungan pelanggan yang memadai</li>
                <li>Membayar komisi platform sebesar 5% dari setiap penjualan</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Aturan untuk Pembeli</h2>
              <p className="mb-4">Sebagai pembeli di platform kami, Anda setuju untuk:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Menggunakan produk yang dibeli sesuai dengan lisensi yang diberikan</li>
                <li>Tidak mendistribusikan ulang produk tanpa izin</li>
                <li>Menghormati hak kekayaan intelektual penjual</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Pembayaran dan Pengembalian Dana</h2>
              <p className="mb-4">
                Semua pembayaran diproses melalui gateway pembayaran yang aman. Kebijakan pengembalian dana:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Pengembalian dana dapat dilakukan dalam 7 hari jika produk tidak sesuai deskripsi</li>
                <li>File yang rusak atau tidak dapat diunduh akan diganti atau dikembalikan dananya</li>
                <li>Permintaan pengembalian dana harus disertai alasan yang jelas</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Hak Kekayaan Intelektual</h2>
              <p className="mb-4">
                Semua konten di platform ini dilindungi hak cipta. Penjual menjamin bahwa mereka memiliki hak atas
                produk yang dijual.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Penangguhan dan Pemutusan</h2>
              <p className="mb-4">
                Kami berhak menangguhkan atau menutup akun yang melanggar syarat dan ketentuan ini tanpa pemberitahuan
                terlebih dahulu.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Batasan Tanggung Jawab</h2>
              <p className="mb-4">
                Jual Digital tidak bertanggung jawab atas kerugian yang timbul dari penggunaan platform atau produk yang
                dibeli melalui platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Perubahan Syarat dan Ketentuan</h2>
              <p className="mb-4">
                Kami dapat mengubah syarat dan ketentuan ini sewaktu-waktu. Perubahan akan diberitahukan melalui
                platform dan berlaku segera.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Hukum yang Berlaku</h2>
              <p className="mb-4">Syarat dan ketentuan ini diatur oleh hukum Republik Indonesia.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Kontak</h2>
              <p className="mb-4">
                Jika Anda memiliki pertanyaan tentang syarat dan ketentuan ini, silakan hubungi kami di:
              </p>
              <ul className="list-none mb-4">
                <li>Email: legal@jualdigital.com</li>
                <li>Telepon: +62 21 1234 5678</li>
                <li>Alamat: Jakarta, Indonesia</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
