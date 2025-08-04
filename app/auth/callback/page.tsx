"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase-client'

function AuthCallbackContent() {
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const [error, setError] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const redirectTo = (path: string) => {
        console.log('[AUTH CALLBACK] Redirecting to:', path)
        // Use window.location for more reliable redirect
        window.location.href = path
    }

    useEffect(() => {
        const handleAuthCallback = async () => {
            if (isProcessing) return
            setIsProcessing(true)

            const next = searchParams.get('next') || '/'
            const code = searchParams.get('code')
            console.log('[AUTH CALLBACK] code:', code)

            if (!code) {
                setError('No authentication code provided')
                setTimeout(() => {
                    redirectTo('/login')
                }, 2000)
                return
            }

            // Add timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                console.log('[AUTH CALLBACK] Timeout reached, forcing redirect...')
                redirectTo(next)
            }, 8000)

            try {
                console.log('[AUTH CALLBACK] calling exchangeCodeForSession...')
                // Use the full URL for PKCE flow
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
                clearTimeout(timeoutId)

                if (exchangeError) {
                    console.error('[AUTH CALLBACK] Exchange error:', exchangeError)
                    // Don't show error for common PKCE issues, just redirect
                    if (exchangeError.message.includes('code verifier') || exchangeError.message.includes('auth code')) {
                        console.log('[AUTH CALLBACK] PKCE issue detected, redirecting to:', next)
                        redirectTo(next)
                        return
                    }
                    setError('Authentication failed: ' + exchangeError.message)
                    setTimeout(() => {
                        redirectTo('/login')
                    }, 2000)
                } else {
                    console.log('[AUTH CALLBACK] Exchange successful, redirecting to:', next)
                    redirectTo(next)
                }
            } catch (err) {
                clearTimeout(timeoutId)
                console.error('[AUTH CALLBACK] Exchange exception:', err)
                // Don't show error for common PKCE issues, just redirect
                if (err instanceof Error && (err.message.includes('code verifier') || err.message.includes('auth code'))) {
                    console.log('[AUTH CALLBACK] PKCE issue detected, redirecting to:', next)
                    redirectTo(next)
                    return
                }
                setError('Authentication failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
                setTimeout(() => {
                    redirectTo('/login')
                }, 2000)
            }
        }

        // Only process if we have a code and user is not already authenticated
        if (searchParams.get('code') && !user) {
            handleAuthCallback()
        } else if (user) {
            // User is already authenticated, redirect immediately
            const next = searchParams.get('next') || '/'
            console.log('[AUTH CALLBACK] User already authenticated, redirecting to:', next)
            // Use a small delay to prevent flash
            setTimeout(() => {
                redirectTo(next)
            }, 100)
        } else if (!searchParams.get('code')) {
            // No code provided, redirect to login
            console.log('[AUTH CALLBACK] No code provided, redirecting to login')
            redirectTo('/login')
        }
    }, [searchParams, user, isProcessing])

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
                            onClick={() => redirectTo('/login')}
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