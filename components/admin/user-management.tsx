"use client"

import { useState, useEffect, useRef } from "react"
import { Users, Search, MoreHorizontal, Edit, Trash2, Ban, CheckCircle, Mail, Shield, User, Clock, X } from "lucide-react"
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

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  joinDate: string
  lastLogin: string
  totalPurchases: number
  totalSpent: number
  productsCount: number
  totalEarnings: number
  avatar: string | null
  phone: string | null
  address: string | null
  city: string | null
  business_name: string | null
  business_category: string | null
  business_description: string | null
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  total_sales: number
  rating: number
  total_reviews: number
  followers: number
  lastOrder: string | null
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  totalAuthors: number
  pendingSellers: number
  newUsersThisMonth: number
}

interface UserData {
  users: User[]
  stats: UserStats
}

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showPendingSellers, setShowPendingSellers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState("")
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    totalAuthors: 0,
    pendingSellers: 0,
    newUsersThisMonth: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  // Track optimistically updated users to preserve their state during refresh
  const optimisticUpdatesRef = useRef<Map<string, { role: string; status: string }>>(new Map())

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchUsers()
    }
  }, [mounted])

  // Auto-refresh every 10 seconds to keep data fresh (more aggressive)
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      fetchUsers()
    }, 10000) // 10 seconds - more frequent updates

    return () => clearInterval(interval)
  }, [mounted])

  // Refresh on page visibility change and window focus
  useEffect(() => {
    if (!mounted) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUsers()
      }
    }

    const handleFocus = () => {
      fetchUsers()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [mounted])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Add cache-busting timestamp and no-cache headers
      const response = await fetch(`/api/admin/users?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data: UserData = await response.json()
      console.log('[USER MANAGEMENT] Fetched users:', data.users.length)
      console.log('[USER MANAGEMENT] Pending sellers count:', data.stats.pendingSellers)
      const pendingList = data.users.filter(u => u.role === 'seller' && u.status === 'pending')
      console.log('[USER MANAGEMENT] Pending sellers:', pendingList.map(u => ({ id: u.id, name: u.name, role: u.role, status: u.status })))
      console.log('[USER MANAGEMENT] Full pending sellers array:', JSON.stringify(pendingList, null, 2))

      // Also log all sellers to see what's happening
      const allSellers = data.users.filter(u => u.role === 'seller')
      console.log('[USER MANAGEMENT] All sellers status breakdown:', {
        total: allSellers.length,
        active: allSellers.filter(u => u.status === 'active').length,
        pending: allSellers.filter(u => u.status === 'pending').length,
        rejected: allSellers.filter(u => u.status === 'rejected').length,
        other: allSellers.filter(u => !['active', 'pending', 'rejected'].includes(u.status || '')).map(u => ({ id: u.id, name: u.name, status: u.status }))
      })
      
      // Merge with existing state - preserve optimistic updates
      setUsers(prevUsers => {
        const mergedUsers = data.users.map(apiUser => {
          // Check if this user has an optimistic update
          const optimisticUpdate = optimisticUpdatesRef.current.get(apiUser.id)
          if (optimisticUpdate) {
            // If API still shows old status, keep optimistic update
            if (optimisticUpdate.status === 'active' && apiUser.status === 'pending') {
              console.log('[USER MANAGEMENT] Keeping optimistic update for', apiUser.id, 'API still shows pending')
              const existingUser = prevUsers.find(u => u.id === apiUser.id)
              if (existingUser && existingUser.status === 'active') {
                return existingUser
              }
            } else if (apiUser.status === optimisticUpdate.status) {
              // API caught up, remove from optimistic updates
              optimisticUpdatesRef.current.delete(apiUser.id)
            }
          }
          return apiUser
        })
        return mergedUsers
      })
      
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setError('Gagal memuat data pengguna')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleSuspendUser = (user: User) => {
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

  const handleActivateUser = (user: User) => {
    toast({
      title: "Akun diaktifkan",
      description: `Akun ${user.name} berhasil diaktifkan kembali.`,
    })
  }

  const handleDeleteUser = (user: User) => {
    toast({
      title: "Akun dihapus",
      description: `Akun ${user.name} berhasil dihapus dari sistem.`,
      variant: "destructive",
    })
  }

  const handlePromoteToAuthor = async (user: User) => {
    // Prevent multiple clicks
    if (processingUsers.has(user.id)) return

    // Prevent approving already approved sellers (prevents duplicate notifications)
    if (user.status === 'active' && user.role === 'seller') {
      toast({
        title: "Sudah Disetujui",
        description: `${user.name} sudah disetujui menjadi seller sebelumnya.`,
      })
      return
    }

    try {
      // Add user to processing set
      setProcessingUsers(prev => new Set(prev).add(user.id))

      // Track this optimistic update
      optimisticUpdatesRef.current.set(user.id, { role: 'seller', status: 'active' })
      
      // Optimistic UI update - immediately remove from list (since filter only shows pending)
      // The user will disappear from the pending list because status changes to 'active'
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === user.id
            ? { ...u, role: 'seller', status: 'active' }
            : u
        )
      )

      // Also update stats immediately
      setStats(prevStats => ({
        ...prevStats,
        pendingSellers: Math.max(0, prevStats.pendingSellers - 1)
      }))

      // Update both role and status in a single API call
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          action: 'approveSeller',
          role: 'seller',
          status: 'active'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to approve seller application: ${errorData.error || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log('[USER MANAGEMENT] Approval response:', result)

      // Update local state immediately with the response data (optimistic update)
      if (result.user) {
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.id === user.id
              ? { ...u, role: result.user.role, status: result.user.status }
              : u
          )
        )

        // Update stats to reflect the change
        if (result.user.status === 'active' && user.status === 'pending') {
          setStats(prevStats => ({
            ...prevStats,
            pendingSellers: Math.max(0, prevStats.pendingSellers - 1)
          }))
        }

        console.log('[USER MANAGEMENT] Updated local state immediately with:', {
          id: result.user.id,
          role: result.user.role,
          status: result.user.status
        })
        console.log('[USER MANAGEMENT] User should now disappear from pending list (status changed to active)')
      }

      // Don't refresh immediately - let the optimistic update work
      // Only refresh after a delay to catch replication lag, but preserve optimistic state
      setTimeout(async () => {
        await fetchUsers()
        // Remove from processing set after refresh
        setProcessingUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(user.id)
          return newSet
        })
      }, 2000)

      // One more refresh after 5 seconds to be absolutely sure
      setTimeout(async () => {
        await fetchUsers()
        // Clear optimistic update if API has caught up
        const currentUser = users.find(u => u.id === user.id)
        if (currentUser && currentUser.status === 'active') {
          optimisticUpdatesRef.current.delete(user.id)
        }
      }, 5000)

      toast({
        title: "Aplikasi disetujui",
        description: `${user.name} berhasil disetujui menjadi seller.`,
      })
    } catch (error) {
      console.error('Error approving seller application:', error)

      // Revert optimistic update on error
      setTimeout(async () => {
        await fetchUsers()
      }, 300)

      toast({
        title: "Error",
        description: `Gagal menyetujui aplikasi seller: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      // Remove user from processing set
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(user.id)
        return newSet
      })
    }
  }

  const handleRejectSeller = (user: User) => {
    setSelectedUser(user)
    setIsRejectDialogOpen(true)
  }

  const handleConfirmRejection = async () => {
    if (!selectedUser) return

    // Store user ID before any operations
    const userIdToProcess = selectedUser.id

    // Prevent multiple clicks
    if (processingUsers.has(userIdToProcess)) return

    try {
      // Add user to processing set
      setProcessingUsers(prev => new Set(prev).add(userIdToProcess))

      // Optimistic UI update - immediately remove from list (since filter only shows pending)
      // The user will disappear from the pending list because status changes to 'rejected'
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === selectedUser.id
            ? { ...u, status: 'rejected' }
            : u
        )
      )

      // Also update stats immediately
      setStats(prevStats => ({
        ...prevStats,
        pendingSellers: Math.max(0, prevStats.pendingSellers - 1)
      }))

      // Update the status to rejected with reason
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: 'updateStatus',
          status: 'rejected',
          rejectionReason: rejectionReason.trim() || 'Aplikasi tidak memenuhi kriteria yang diperlukan'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to reject seller application: ${errorData.error || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log('[USER MANAGEMENT] Rejection response:', result)

      // Update local state immediately with the response data (optimistic update)
      if (result.user) {
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.id === selectedUser.id
              ? { ...u, status: result.user.status }
              : u
          )
        )

        // Update stats to reflect the change
        if (result.user.status === 'rejected' && selectedUser.status === 'pending') {
          setStats(prevStats => ({
            ...prevStats,
            pendingSellers: Math.max(0, prevStats.pendingSellers - 1)
          }))
        }

        console.log('[USER MANAGEMENT] Updated local state immediately with:', {
          id: result.user.id,
          status: result.user.status
        })
        console.log('[USER MANAGEMENT] User should now disappear from pending list (status changed to rejected)')
      }

      const rejectedUserName = selectedUser.name

      // Close dialog and reset
      setIsRejectDialogOpen(false)
      setRejectionReason("")
      setSelectedUser(null)

      // Also refresh data after a short delay to ensure everything is in sync
      setTimeout(async () => {
        await fetchUsers()
      }, 500)

      toast({
        title: "Aplikasi ditolak",
        description: `Aplikasi seller ${rejectedUserName} telah ditolak.`,
      })
    } catch (error) {
      console.error('Error rejecting seller application:', error)

      // Revert optimistic update on error
      setTimeout(async () => {
        await fetchUsers()
      }, 300)

      toast({
        title: "Error",
        description: `Gagal menolak aplikasi seller: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      // Remove user from processing set using the stored ID
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userIdToProcess)
        return newSet
      })
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-100 text-red-800">Admin</Badge>
      case "seller":
        return <Badge className="bg-blue-100 text-blue-800">Seller</Badge>
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID")
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Pengguna</h1>
          <p className="text-muted-foreground">Kelola semua pengguna platform</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Memuat data pengguna...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Pengguna</h1>
          <p className="text-muted-foreground">Kelola semua pengguna platform</p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
          <Button onClick={fetchUsers} className="mt-2">
            Coba Lagi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manajemen Pengguna</h1>
        <p className="text-muted-foreground">Kelola semua pengguna platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengguna Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditangguhkan</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspendedUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Seller</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalAuthors.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengguna Baru</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newUsersThisMonth}</div>
            <p className="text-xs text-muted-foreground">bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aplikasi Seller</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingSellers}</div>
            <p className="text-xs text-muted-foreground">menunggu persetujuan</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Seller Applications */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Aplikasi Seller Tertunda</h3>
              <p className="text-sm text-muted-foreground">
                Tinjau dan setujui aplikasi pengguna yang ingin menjadi seller
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUsers()}
                disabled={loading}
              >
                {loading ? "Memuat..." : "Refresh"}
              </Button>
              <Button
                variant={showPendingSellers ? "default" : "outline"}
                onClick={() => setShowPendingSellers(!showPendingSellers)}
              >
                {showPendingSellers ? "Sembunyikan" : "Tampilkan"} Aplikasi Tertunda
              </Button>
            </div>
          </div>

          {showPendingSellers && (
            <div className="space-y-4">
              {(() => {
                // Filter for pending seller applications - only show users with role='seller' and status='pending'
                // Use strict equality and ensure we're checking the actual values
                const pendingSellers = users.filter(user => {
                  const isSeller = user.role === 'seller'
                  const isPending = user.status === 'pending'
                  const result = isSeller && isPending
                  if (isSeller && !isPending) {
                    console.log('[USER MANAGEMENT] Seller not pending:', { id: user.id, name: user.name, role: user.role, status: user.status })
                  }
                  return result
                })
                console.log('[USER MANAGEMENT] Filtered pending sellers:', pendingSellers.length, 'out of', users.length, 'total users')
                console.log('[USER MANAGEMENT] All users statuses:', users.filter(u => u.role === 'seller').map(u => ({ id: u.id, name: u.name, role: u.role, status: u.status, statusType: typeof u.status })))
                console.log('[USER MANAGEMENT] Pending sellers details:', pendingSellers.map(u => ({ id: u.id, name: u.name, status: u.status })))
                return pendingSellers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Tidak ada aplikasi seller tertunda
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {pendingSellers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            {user.business_name && (
                              <div className="text-sm text-muted-foreground">
                                Bisnis: {user.business_name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handlePromoteToAuthor(user)}
                            disabled={processingUsers.has(user.id) || user.status !== 'pending'}
                            variant={user.status !== 'pending' ? "outline" : "default"}
                          >
                            {processingUsers.has(user.id) ? "Memproses..." : user.status === 'pending' ? "Setujui" : "Sudah Disetujui"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectSeller(user)}
                            disabled={processingUsers.has(user.id) || user.status !== 'pending'}
                          >
                            {processingUsers.has(user.id) ? "Memproses..." : "Tolak"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>

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
                <SelectItem value="seller">Seller</SelectItem>
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
          <CardTitle>Daftar Pengguna ({filteredUsers.length})</CardTitle>
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
                      <img
                        src={user.avatar || "/placeholder.svg"}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg"
                        }}
                      />
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
                      {user.status === "suspended" && (
                        <div className="text-xs text-red-600 mt-1">Akun ditangguhkan</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Bergabung: {formatDate(user.joinDate)}</div>
                      <div className="text-muted-foreground">
                        Update terakhir: {formatDate(user.lastLogin)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        Pembelian: {user.totalPurchases} ({formatCurrency(user.totalSpent)})
                      </div>
                      {user.role === "seller" && (
                        <div className="text-muted-foreground">
                          Produk: {user.productsCount} | Penghasilan: {formatCurrency(user.totalEarnings)}
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
                        <DropdownMenuItem>
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
                            Jadikan Seller
                          </DropdownMenuItem>
                        )}
                        {user.role === "seller" && user.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handlePromoteToAuthor(user)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Setujui Aplikasi Seller
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRejectSeller(user)}>
                              <X className="w-4 h-4 mr-2" />
                              Tolak Aplikasi Seller
                            </DropdownMenuItem>
                          </>
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

      {/* Reject Seller Application Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Aplikasi Seller</DialogTitle>
            <DialogDescription>
              Anda akan menolak aplikasi seller untuk {selectedUser?.name}. Berikan alasan penolakan agar mereka tahu apa yang perlu diperbaiki.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Alasan Penolakan *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Contoh: Data bisnis tidak lengkap, nomor rekening tidak valid, atau informasi yang perlu diperbaiki..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alasan ini akan dikirim ke seller via WhatsApp dan email untuk membantu mereka memperbaiki aplikasi.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setIsRejectDialogOpen(false)
                setRejectionReason("")
                setSelectedUser(null)
              }} className="flex-1">
                Batal
              </Button>
              <Button
                onClick={handleConfirmRejection}
                variant="destructive"
                className="flex-1"
                disabled={!rejectionReason.trim()}
              >
                Tolak Aplikasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
