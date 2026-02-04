"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

export default function VerifyEmailPage() {
    const [code, setCode] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get("email")
    const { confirmSignup } = useAuth()

    useEffect(() => {
        if (!email) {
            router.push("/signup")
        }
    }, [email, router])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")

        if (!code || code.length !== 6) {
            setError("Please enter a valid 6-digit code")
            return
        }

        setLoading(true)

        try {
            const result = await confirmSignup(email, code)
            if (result.success) {
                setSuccess(true)
                setTimeout(() => {
                    router.push("/login")
                }, 2000)
            } else {
                setError(result.error || "Verification failed")
            }
        } catch (err) {
            setError("An error occurred. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    if (!email) {
        return null
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-t from-primary/5 to-card border border-border rounded-2xl mb-4 shadow-sm">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Verify Your Email</h1>
                    <p className="text-muted-foreground mt-2">
                        We've sent a verification code to<br />
                        <span className="font-semibold text-foreground">{email}</span>
                    </p>
                </div>

                {/* Verification Form */}
                <div className="bg-gradient-to-t from-primary/5 to-card rounded-2xl shadow-xs p-8 border border-border">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Email Verified!</h3>
                            <p className="text-muted-foreground">Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-foreground mb-2">
                                    Verification Code
                                </label>
                                <input
                                    id="code"
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all outline-none text-foreground text-center text-2xl tracking-widest font-mono"
                                    placeholder="000000"
                                    autoComplete="off"
                                />
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Enter the 6-digit code from your email
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Verifying...
                                    </span>
                                ) : (
                                    "Verify Email"
                                )}
                            </button>

                            <div className="text-center text-sm text-muted-foreground">
                                Didn't receive the code?{" "}
                                <button type="button" className="text-primary hover:text-primary/80 font-semibold">
                                    Resend
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground">
                            ← Back to signup
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
