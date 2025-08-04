"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface AuthCheckProps {
    children: React.ReactNode
    requireAuth?: boolean
    requireSeller?: boolean
}

export function AuthCheck({ children, requireAuth = true, requireSeller = false }: AuthCheckProps) {
    const { user, loading } = useAuth()
    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Show loading state until component is mounted and auth state is determined
    if (!mounted || loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Memeriksa autentikasi...</span>
                </div>
            </div>
        )
    }

    // If auth is required but user is not authenticated
    if (requireAuth && !user) {
        // Store current path for redirect after login
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
        }
        router.push('/login')
        return null
    }

    // If seller role is required but user is not a seller
    if (requireSeller && user && user.user_metadata?.role !== 'seller') {
        router.push('/mulai-jualan')
        return null
    }

    return <>{children}</>
} 