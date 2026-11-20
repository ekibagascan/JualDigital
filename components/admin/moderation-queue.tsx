"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Report = {
  id: string
  reporter_id: string
  target_type: string
  target_id: string
  reason: string
  details: string | null
  source: string
  status: string
  admin_note: string | null
  action_taken: string | null
  created_at: string
  age_hours: number
  overdue: boolean
  reporter: { name: string | null; email: string | null } | null
  target_user: { name: string | null; email: string | null; status: string | null } | null
}

const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "open", label: "Terbuka" },
  { id: "reviewing", label: "Ditinjau" },
  { id: "actioned", label: "Ditindak" },
  { id: "dismissed", label: "Ditutup" },
]

export function ModerationQueue() {
  const [status, setStatus] = useState("open")
  const [reports, setReports] = useState<Report[]>([])
  const [counts, setCounts] = useState({ total: 0, open: 0, overdue: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/moderation?status=${status}`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) {
        setReports(payload.reports || [])
        setError(payload.error || "Gagal memuat laporan")
        return
      }
      setReports(payload.reports || [])
      setCounts(payload.counts || { total: 0, open: 0, overdue: 0 })
    } catch {
      setError("Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  async function act(reportId: string, action: string) {
    setBusyId(reportId + action)
    setError("")
    try {
      const response = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, action }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || "Gagal menindak laporan")
        return
      }
      await load()
    } catch {
      setError("Gagal menindak laporan")
    } finally {
      setBusyId("")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Laporan konten</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Setiap laporan pengguna, termasuk pemblokiran, harus ditinjau dan ditindak dalam 24 jam.
          Turunkan konten yang melanggar atau tangguhkan akun yang menyalahgunakan platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pada filter ini</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{counts.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Masih terbuka</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{counts.open}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Lewat 24 jam</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">{counts.overdue}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.id}
            variant={status === filter.id ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(filter.id)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Memuat laporan...</p> : null}
      {!loading && reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada laporan pada filter ini.</p>
      ) : null}

      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.id} className={report.overdue ? "border-red-500" : undefined}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{report.reason}</CardTitle>
                <Badge variant="outline">{report.target_type}</Badge>
                <Badge variant={report.overdue ? "destructive" : "secondary"}>{report.status}</Badge>
                {report.source === "block" ? <Badge variant="outline">blokir</Badge> : null}
                <span className="text-xs text-muted-foreground">{report.age_hours} jam</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap">{report.details || "Tidak ada detail tambahan."}</p>
              <p className="text-muted-foreground break-all">
                Target: {report.target_id}
                {report.target_user ? ` · ${report.target_user.name || report.target_user.email || ""} (${report.target_user.status || "unknown"})` : ""}
              </p>
              <p className="text-muted-foreground">
                Pelapor: {report.reporter?.name || report.reporter?.email || report.reporter_id}
              </p>
              {report.action_taken ? <p>Tindakan: {report.action_taken}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={!!busyId} onClick={() => act(report.id, "reviewing")}>
                  Tandai ditinjau
                </Button>
                <Button size="sm" variant="outline" disabled={!!busyId} onClick={() => act(report.id, "takedown")}>
                  Turunkan konten
                </Button>
                <Button size="sm" variant="destructive" disabled={!!busyId} onClick={() => act(report.id, "suspend_user")}>
                  Tangguhkan pengguna
                </Button>
                <Button size="sm" variant="ghost" disabled={!!busyId} onClick={() => act(report.id, "dismiss")}>
                  Tutup
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
