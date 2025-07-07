"use client"

import { useState } from "react"
import { Users, Search, MoreHorizontal, Edit, Trash2, Ban, CheckCircle, Mail, Shield, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

// Mock data
const mockUsers = [
  {
    id: "1",
    name: "Ahmad Rizki",
    email: "ahmad.rizki@email.com",
    role: "user",
    status: "active",
    joinDate: "2024-01-15",
    lastLogin: "2024-01-25",
    totalPurchases: 5,
    totalSpent: 1245000,
    productsCount: 0,
    avatar: "/placeholder.svg?height=40&width=40&text=AR",
  },
  {
    id: "2",
    name: "Sarah Design",
    email: "sarah.design@email.com",
    role: "author",
    status: "active",
    joinDate: "2023-12-10",
    lastLogin: "2024-01-24",
    totalPurchases: 2,
    totalSpent: 398000,
    productsCount: 15,
    totalEarnings: 12450000,
    avatar: "/placeholder.svg?height=40&width=40&text=SD",
  },
  {
    id: "3",
    name: "Budi Santoso",
    email: "budi.santoso@email.com",
    role: "user",
    status: "suspended",
    joinDate: "2024-01-20",
    lastLogin: "2024-01-22",
    totalPurchases: 1,
    totalSpent: 99000,
    productsCount: 0,
    suspensionReason: "Melanggar terms of service",
    avatar: "/placeholder.svg?height=40&width=40&text=BS",
  },
]

const mockStats = {
  totalUsers: 12345,
  activeUsers: 11890,
  suspendedUsers: 455,
  totalAuthors: 1234,
  newUsersThisMonth: 234,
}

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState("")

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleSuspendUser = (user: any) => {
    setSelectedUser(user)
    setIsSuspendDialogOpen(true)
  }

  const handleConfirmSuspension = () => {
    if (!suspensionReason.trim()) {
      toast({
        title: "Alasan diperlukan",
        description: "Mohon berikan alasan penangguhan akun.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Akun ditangguhkan",
      description: `Akun ${selectedUser?.name} berhasil ditangguhkan.`,
    })

    setIsSuspendDialogOpen(false)
    setSuspensionReason("")
    setSelectedUser(null)
  }

  const handleActivateUser = (user: any) => {
    toast({
      title: "Akun diaktifkan",
      description: `Akun ${user.name} berhasil diaktifkan kembali.`,
    })
  }

  const handleDeleteUser = (user: any) => {
    toast({
      title: "Akun dihapus",
      description: `Akun ${user.name} berhasil dihapus dari sistem.`,
      variant: "destructive",
    })
  }

  const handlePromoteToAuthor = (user: any) => {
    toast({
      title: "Role diubah",
      description: `${user.name} berhasil dipromosikan menjadi author.`,
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-100 text-red-800">Admin</Badge>
      case "author":
        return <Badge className="bg-blue-100 text-blue-800">Author</Badge>
      case "user":
        return <Badge className="bg-gray-100 text-gray-800">User</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Aktif</Badge>
      case "suspended":
        return <Badge className="bg-red-100 text-red-800">Ditangguhkan</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Tidak Aktif</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manajemen Pengguna</h1>
        <p className="text-muted-foreground">Kelola semua pengguna platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalUsers.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengguna Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockStats.activeUsers.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditangguhkan</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{mockStats.suspendedUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Author</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{mockStats.totalAuthors.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengguna Baru</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.newUsersThisMonth}</div>
            <p className="text-xs text-muted-foreground">bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Cari pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="author">Author</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="suspended">Ditangguhkan</SelectItem>
                <SelectItem value="inactive">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengguna</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aktivitas</TableHead>
                <TableHead>Statistik</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={user.avatar || "/placeholder.svg"} alt={user.name} className="w-10 h-10 rounded-full" />
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <div>
                      {getStatusBadge(user.status)}
                      {user.status === "suspended" && user.suspensionReason && (
                        <div className="text-xs text-red-600 mt-1">{user.suspensionReason}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Bergabung: {new Date(user.joinDate).toLocaleDateString("id-ID")}</div>
                      <div className="text-muted-foreground">
                        Login terakhir: {new Date(user.lastLogin).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        Pembelian: {user.totalPurchases} ({formatCurrency(user.totalSpent)})
                      </div>
                      {user.role === "author" && (
                        <div className="text-muted-foreground">
                          Produk: {user.productsCount} | Penghasilan: {formatCurrency(user.totalEarnings || 0)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Pengguna
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-4 h-4 mr-2" />
                          Kirim Email
                        </DropdownMenuItem>
                        {user.role === "user" && (
                          <DropdownMenuItem onClick={() => handlePromoteToAuthor(user)}>
                            <Shield className="w-4 h-4 mr-2" />
                            Jadikan Author
                          </DropdownMenuItem>
                        )}
                        {user.status === "active" ? (
                          <DropdownMenuItem onClick={() => handleSuspendUser(user)}>
                            <Ban className="w-4 h-4 mr-2" />
                            Tangguhkan Akun
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleActivateUser(user)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aktifkan Akun
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus Akun
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Suspend User Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tangguhkan Akun Pengguna</DialogTitle>
            <DialogDescription>
              Anda akan menangguhkan akun {selectedUser?.name}. Pengguna tidak akan dapat mengakses platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Alasan Penangguhan *</Label>
              <Textarea
                id="reason"
                placeholder="Jelaskan alasan penangguhan akun..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)} className="flex-1">
                Batal
              </Button>
              <Button onClick={handleConfirmSuspension} variant="destructive" className="flex-1">
                Tangguhkan Akun
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
