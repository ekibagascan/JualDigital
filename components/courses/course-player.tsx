"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { CheckCircle2, Lock, PlayCircle } from "lucide-react"

interface Lesson {
  id: string
  title: string
  content_type: string
  duration_sec?: number
  is_preview?: boolean
  locked?: boolean
  body?: string
}

interface Section {
  id: string
  title: string
  lessons: Lesson[]
}

interface CoursePlayerProps {
  productId: string
}

export function CoursePlayer({ productId }: CoursePlayerProps) {
  const { user } = useAuth()
  const [sections, setSections] = useState<Section[]>([])
  const [enrolled, setEnrolled] = useState(false)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Lesson | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [textBody, setTextBody] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMedia, setLoadingMedia] = useState(false)

  const load = useCallback(async () => {
    try {
      const [currRes, enrollRes] = await Promise.all([
        fetch(`/api/courses/${productId}/curriculum`),
        fetch(`/api/courses/${productId}/enroll`),
      ])
      const curr = await currRes.json()
      const enroll = await enrollRes.json()

      if (!currRes.ok) throw new Error(curr.error || "Gagal memuat kurikulum")

      setSections(curr.sections || [])
      setEnrolled(!!curr.enrolled || !!enroll.enrolled)
      setEnrollmentId(enroll.enrollment?.id || null)

      const map: Record<string, boolean> = {}
      for (const p of enroll.progress || []) {
        if (p.completed_at) map[p.lesson_id] = true
      }
      setProgress(map)

      const firstOpen = (curr.sections || [])
        .flatMap((s: Section) => s.lessons)
        .find((l: Lesson) => !l.locked)
      if (firstOpen) setSelected(firstOpen)
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Gagal memuat kursus",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!selected || selected.locked) {
      setMediaUrl(null)
      setTextBody(null)
      return
    }

    let cancelled = false
    const loadMedia = async () => {
      setLoadingMedia(true)
      setMediaUrl(null)
      setTextBody(null)
      try {
        const res = await fetch(`/api/courses/lessons/${selected.id}/media`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Gagal memuat media")
        if (cancelled) return
        if (data.content_type === "text") {
          setTextBody(data.body || "")
        } else {
          setMediaUrl(data.url || null)
          if (data.body) setTextBody(data.body)
        }
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Gagal",
            description: e instanceof Error ? e.message : "Tidak dapat memuat media",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setLoadingMedia(false)
      }
    }
    loadMedia()
    return () => {
      cancelled = true
    }
  }, [selected])

  const markComplete = async () => {
    if (!enrollmentId || !selected) return
    try {
      const res = await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          lesson_id: selected.id,
          position_sec: 0,
          completed: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProgress((p) => ({ ...p, [selected.id]: true }))
      toast({ title: "Selesai", description: "Pelajaran ditandai selesai" })
    } catch (e) {
      toast({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan progres",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse bg-muted rounded-lg" />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[70vh]">
      <aside className="border rounded-lg overflow-hidden bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Kurikulum</h2>
          {!enrolled && (
            <p className="text-xs text-muted-foreground mt-1">
              Beberapa pelajaran terkunci.{" "}
              <Link href={`/product/${productId}`} className="underline text-primary">
                Beli kursus
              </Link>
            </p>
          )}
        </div>
        <div className="h-[60vh] overflow-y-auto">
          <div className="p-2 space-y-4">
            {sections.map((section) => (
              <div key={section.id}>
                <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {section.lessons.map((lesson) => {
                    const active = selected?.id === lesson.id
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          disabled={!!lesson.locked}
                          onClick={() => setSelected(lesson)}
                          className={`w-full text-left px-2 py-2 rounded-md text-sm flex items-center gap-2 ${
                            active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          } ${lesson.locked ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {lesson.locked ? (
                            <Lock className="w-4 h-4 shrink-0" />
                          ) : progress[lesson.id] ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                          ) : (
                            <PlayCircle className="w-4 h-4 shrink-0" />
                          )}
                          <span className="flex-1 line-clamp-2">{lesson.title}</span>
                          {lesson.is_preview && (
                            <Badge variant="outline" className="text-[10px] px-1">
                              Preview
                            </Badge>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {sections.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Kurikulum belum tersedia.</p>
            )}
          </div>
        </div>
      </aside>

      <section className="border rounded-lg p-4 sm:p-6 bg-card min-h-[50vh]">
        {!selected ? (
          <p className="text-muted-foreground">Pilih pelajaran dari kurikulum.</p>
        ) : selected.locked ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
            <Lock className="w-10 h-10 text-muted-foreground" />
            <p className="font-medium">Pelajaran terkunci</p>
            <Button asChild>
              <Link href={`/product/${productId}`}>Beli untuk akses penuh</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{selected.title}</h1>
                <p className="text-sm text-muted-foreground capitalize">{selected.content_type}</p>
              </div>
              {enrolled && user && (
                <Button variant="outline" size="sm" onClick={markComplete} disabled={!!progress[selected.id]}>
                  {progress[selected.id] ? "Selesai" : "Tandai selesai"}
                </Button>
              )}
            </div>

            {loadingMedia && <div className="h-64 animate-pulse bg-muted rounded-lg" />}

            {!loadingMedia && mediaUrl && selected.content_type === "video" && (
              <video src={mediaUrl} controls className="w-full rounded-lg bg-black max-h-[70vh]" />
            )}

            {!loadingMedia && mediaUrl && selected.content_type === "file" && (
              <a href={mediaUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                Unduh / buka file
              </a>
            )}

            {!loadingMedia && textBody && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">{textBody}</div>
            )}

            {!loadingMedia && !mediaUrl && !textBody && (
              <p className="text-muted-foreground">Konten tidak tersedia.</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
