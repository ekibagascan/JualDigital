import { TrendingUp, Users, Download, Star } from "lucide-react"

const stats = [
  {
    icon: Users,
    value: "10,000+",
    label: "Pengguna Aktif",
    description: "Bergabung dengan komunitas kreator",
  },
  {
    icon: Download,
    value: "50,000+",
    label: "Total Download",
    description: "Produk digital telah diunduh",
  },
  {
    icon: TrendingUp,
    value: "Rp 2M+",
    label: "Total Transaksi",
    description: "Nilai transaksi bulanan",
  },
  {
    icon: Star,
    value: "4.8/5",
    label: "Rating Rata-rata",
    description: "Kepuasan pengguna",
  },
]

export function StatsSection() {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Dipercaya Ribuan Pengguna</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">Platform marketplace digital terdepan di Indonesia</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="p-3 bg-primary-foreground/10 rounded-full">
                    <Icon className="h-8 w-8" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-lg font-semibold mb-1">{stat.label}</div>
                <div className="text-sm opacity-80">{stat.description}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
