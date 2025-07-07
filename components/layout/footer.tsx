import Link from "next/link"
import { Facebook, Twitter, Instagram, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">JD</span>
              </div>
              <span className="font-bold text-xl">Jual Digital</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Platform marketplace produk digital terpercaya di Indonesia. Jual dan beli produk digital dengan mudah dan
              aman.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Kategori */}
          <div className="space-y-4">
            <h3 className="font-semibold">Kategori</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/categories/ebook" className="text-muted-foreground hover:text-primary">
                  E-book
                </Link>
              </li>
              <li>
                <Link href="/categories/template" className="text-muted-foreground hover:text-primary">
                  Template
                </Link>
              </li>
              <li>
                <Link href="/categories/music" className="text-muted-foreground hover:text-primary">
                  Musik
                </Link>
              </li>
              <li>
                <Link href="/categories/software" className="text-muted-foreground hover:text-primary">
                  Software
                </Link>
              </li>
              <li>
                <Link href="/categories/course" className="text-muted-foreground hover:text-primary">
                  Kursus Online
                </Link>
              </li>
            </ul>
          </div>

          {/* Bantuan */}
          <div className="space-y-4">
            <h3 className="font-semibold">Bantuan</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary">
                  Pusat Bantuan
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary">
                  Hubungi Kami
                </Link>
              </li>
              <li>
                <Link href="/become-author" className="text-muted-foreground hover:text-primary">
                  Jadi Penjual
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-primary">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary">
                  Syarat & Ketentuan
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary">
                  Tentang Kami
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Jual Digital. Semua hak dilindungi.</p>
        </div>
      </div>
    </footer>
  )
}
