import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Package, DollarSign, TrendingUp, ShoppingCart, Eye, Star } from "lucide-react"

const stats = [
  {
    title: "Total Pengguna",
    value: "12,345",
    change: "+12%",
    changeType: "positive" as const,
    icon: Users,
  },
  {
    title: "Total Produk",
    value: "8,901",
    change: "+8%",
    changeType: "positive" as const,
    icon: Package,
  },
  {
    title: "Pendapatan Bulan Ini",
    value: "Rp 2.4M",
    change: "+23%",
    changeType: "positive" as const,
    icon: DollarSign,
  },
  {
    title: "Total Transaksi",
    value: "34,567",
    change: "+18%",
    changeType: "positive" as const,
    icon: TrendingUp,
  },
]

const recentActivities = [
  {
    type: "user",
    message: "Pengguna baru Ahmad Rizki mendaftar",
    time: "5 menit yang lalu",
    icon: Users,
  },
  {
    type: "product",
    message: "Produk baru 'E-book Digital Marketing' diterbitkan",
    time: "15 menit yang lalu",
    icon: Package,
  },
  {
    type: "payment",
    message: "Pembayaran Rp 99,000 berhasil diproses",
    time: "23 menit yang lalu",
    icon: DollarSign,
  },
  {
    type: "review",
    message: "Review 5 bintang untuk produk Template Website",
    time: "1 jam yang lalu",
    icon: Star,
  },
]

const topProducts = [
  {
    name: "E-book Panduan Digital Marketing",
    sales: 1234,
    revenue: "Rp 122.3M",
    views: 5678,
  },
  {
    name: "Template Website Modern",
    sales: 856,
    revenue: "Rp 170.4M",
    views: 3421,
  },
  {
    name: "Kursus React & Next.js",
    sales: 642,
    revenue: "Rp 256.2M",
    views: 2890,
  },
  {
    name: "Pack Audio Cinematic",
    sales: 423,
    revenue: "Rp 63.0M",
    views: 1567,
  },
]

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Selamat datang di admin panel Jual Digital</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${stat.changeType === "positive" ? "text-green-600" : "text-red-600"}`}>
                  {stat.change} dari bulan lalu
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="p-2 bg-muted rounded-full">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {product.sales.toLocaleString("id-ID")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {product.views.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">{product.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <Users className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium mb-1">Kelola Pengguna</h3>
              <p className="text-sm text-muted-foreground">Lihat dan kelola akun pengguna</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <Package className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium mb-1">Review Produk</h3>
              <p className="text-sm text-muted-foreground">Tinjau produk yang menunggu persetujuan</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <DollarSign className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium mb-1">Proses Pembayaran</h3>
              <p className="text-sm text-muted-foreground">Kelola pembayaran dan penarikan</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
