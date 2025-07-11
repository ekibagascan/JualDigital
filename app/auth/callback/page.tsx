"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const code = searchParams.get('code')
        const next = searchParams.get('next') || '/'
        console.log('[AUTH CALLBACK] code:', code)
        if (!code) {
            setError('No authentication code provided')
            setTimeout(() => {
                console.log('[AUTH CALLBACK] redirecting to /login (no code)')
                router.replace('/login')
            }, 1500)
            return
        }
        console.log('[AUTH CALLBACK] calling exchangeCodeForSession...')
        const promise = supabase.auth.exchangeCodeForSession(code)
        promise.then(({ error: exchangeError, data }) => {
            console.log('[AUTH CALLBACK] exchangeCodeForSession resolved:', { exchangeError, data })
            if (exchangeError) {
                setError('Authentication failed: ' + exchangeError.message)
                setTimeout(() => {
                    console.log('[AUTH CALLBACK] redirecting to /login (exchange error)')
                    router.replace('/login')
                }, 1500)
            } else {
                console.log('[AUTH CALLBACK] redirecting to', next)
                router.replace(next)
            }
        })
            .catch((err) => {
                console.log('[AUTH CALLBACK] exchangeCodeForSession rejected:', err)
                setError('Authentication failed: ' + (err?.message || 'Unknown error'))
                setTimeout(() => {
                    console.log('[AUTH CALLBACK] redirecting to /login (catch)')
                    router.replace('/login')
                }, 1500)
            })
        // Extra: log if the promise never resolves after 5 seconds
        setTimeout(() => {
            console.log('[AUTH CALLBACK] exchangeCodeForSession still pending after 5s')
        }, 5000)
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
                    <h2 className="text-xl font-semibold mb-2">Loading...</h2>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    )
} 