import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Kebijakan Privasi</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground mb-8">Terakhir diperbarui: 1 Januari 2024</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Pendahuluan</h2>
              <p className="mb-4">
                Jual Digital menghargai privasi Anda dan berkomitmen untuk melindungi data pribadi Anda. Kebijakan
                privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Informasi yang Kami Kumpulkan</h2>
              <h3 className="text-xl font-medium mb-3">Informasi yang Anda berikan:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Nama lengkap</li>
                <li>Alamat email</li>
                <li>Nomor telepon</li>
                <li>Informasi pembayaran</li>
                <li>Konten yang Anda upload atau buat</li>
                <li>Komunikasi dengan layanan pelanggan</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">Informasi yang dikumpulkan secara otomatis:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Alamat IP</li>
                <li>Jenis browser dan perangkat</li>
                <li>Data penggunaan dan aktivitas di platform</li>
                <li>Cookie dan teknologi pelacakan serupa</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Bagaimana Kami Menggunakan Informasi Anda</h2>
              <p className="mb-4">Kami menggunakan informasi Anda untuk:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Menyediakan dan memelihara layanan kami</li>
                <li>Memproses transaksi dan pembayaran</li>
                <li>Berkomunikasi dengan Anda tentang akun dan layanan</li>
                <li>Meningkatkan keamanan platform</li>
                <li>Menganalisis penggunaan untuk perbaikan layanan</li>
                <li>Mengirim newsletter dan promosi (dengan persetujuan Anda)</li>
                <li>Mematuhi kewajiban hukum</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Berbagi Informasi</h2>
              <p className="mb-4">
                Kami tidak menjual data pribadi Anda. Kami dapat membagikan informasi dalam situasi berikut:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Dengan penyedia layanan pihak ketiga yang membantu operasi kami</li>
                <li>Untuk mematuhi kewajiban hukum atau perintah pengadilan</li>
                <li>Untuk melindungi hak, properti, atau keselamatan kami dan pengguna lain</li>
                <li>Dalam hal merger, akuisisi, atau penjualan aset</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Keamanan Data</h2>
              <p className="mb-4">
                Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang sesuai untuk melindungi data pribadi
                Anda, termasuk:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Enkripsi data saat transit dan saat disimpan</li>
                <li>Akses terbatas hanya untuk personel yang berwenang</li>
                <li>Pemantauan keamanan secara berkala</li>
                <li>Backup data yang aman</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Cookie dan Teknologi Pelacakan</h2>
              <p className="mb-4">
                Kami menggunakan cookie dan teknologi serupa untuk meningkatkan pengalaman Anda. Anda dapat mengatur
                preferensi cookie di browser Anda.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Hak Anda</h2>
              <p className="mb-4">Anda memiliki hak untuk:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Mengakses data pribadi yang kami miliki tentang Anda</li>
                <li>Meminta perbaikan data yang tidak akurat</li>
                <li>Meminta penghapusan data pribadi Anda</li>
                <li>Membatasi pemrosesan data Anda</li>
                <li>Portabilitas data</li>
                <li>Menarik persetujuan kapan saja</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Retensi Data</h2>
              <p className="mb-4">
                Kami menyimpan data pribadi Anda selama diperlukan untuk tujuan yang dijelaskan dalam kebijakan ini atau
                sesuai dengan kewajiban hukum.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Transfer Data Internasional</h2>
              <p className="mb-4">
                Data Anda dapat diproses di server yang berlokasi di luar Indonesia. Kami memastikan perlindungan yang
                memadai untuk transfer tersebut.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Perubahan Kebijakan Privasi</h2>
              <p className="mb-4">
                Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Perubahan akan diberitahukan melalui
                platform kami.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Kontak</h2>
              <p className="mb-4">
                Jika Anda memiliki pertanyaan tentang kebijakan privasi ini atau ingin menggunakan hak Anda, hubungi
                kami di:
              </p>
              <ul className="list-none mb-4">
                <li>Email: privacy@jualdigital.com</li>
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
