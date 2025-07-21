"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase-client'

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const [error, setError] = useState<string | null>(null)

    // Listen for auth state changes and redirect when user is authenticated
    useEffect(() => {
        if (user) {
            const next = searchParams.get('next') || '/'
            console.log('[AUTH CALLBACK] User authenticated, redirecting to:', next)
            router.replace(next)
        }
    }, [user, router, searchParams])

    useEffect(() => {
        const handleAuthCallback = async () => {
            const code = searchParams.get('code')
            const next = searchParams.get('next') || '/'

            console.log('[AUTH CALLBACK] code:', code)

            if (!code) {
                setError('No authentication code provided')
                setTimeout(() => {
                    router.replace('/login')
                }, 2000)
                return
            }

            // Check if user is already authenticated
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                console.log('[AUTH CALLBACK] User already authenticated, redirecting immediately...')
                router.replace(next)
                return
            }

            // Add timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                console.log('[AUTH CALLBACK] Timeout reached, forcing redirect...')
                router.replace(next)
            }, 5000)

            try {
                console.log('[AUTH CALLBACK] calling exchangeCodeForSession...')

                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

                clearTimeout(timeoutId)

                if (exchangeError) {
                    console.error('[AUTH CALLBACK] Exchange error:', exchangeError)
                    setError('Authentication failed: ' + exchangeError.message)
                    setTimeout(() => {
                        router.replace('/login')
                    }, 2000)
                } else {
                    console.log('[AUTH CALLBACK] Exchange successful, redirecting to:', next)
                    router.replace(next)
                }
            } catch (err) {
                clearTimeout(timeoutId)
                console.error('[AUTH CALLBACK] Exchange exception:', err)
                setError('Authentication failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
                setTimeout(() => {
                    router.replace('/login')
                }, 2000)
            }
        }

        handleAuthCallback()
    }, [router, searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full mx-auto p-6">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">
                        {error ? "Authentication Error" : "Logging you in..."}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                        {error ? error : "Please wait, you will be redirected automatically."}
                    </p>
                    {error && (
                        <button
                            className="mt-4 px-4 py-2 bg-primary text-white rounded"
                            onClick={() => router.replace('/login')}
                        >
                            Go to Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    )
} 