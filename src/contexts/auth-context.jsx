"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signUp, signIn, signOut, getCurrentUser, confirmSignUp, fetchUserAttributes } from "aws-amplify/auth"
import { clearTokenCache } from "@/lib/api-client"
import "../lib/amplify-config"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => { checkUser() }, [])

    const checkUser = async () => {
        try {
            const currentUser = await getCurrentUser()
            let attrs = {}
            try { attrs = await fetchUserAttributes() } catch { }
            const email = attrs.email || currentUser.signInDetails?.loginId || ''
            const name = attrs.name || email.split('@')[0] || 'User'
            setUser({ id: currentUser.userId, email, name })
        } catch {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        try {
            const { isSignedIn } = await signIn({ username: email, password })
            if (isSignedIn) {
                await checkUser()
                return { success: true }
            }
            return { success: false, error: "Login failed" }
        } catch (error) {
            return { success: false, error: error.message || "Invalid email or password" }
        }
    }

    const signup = async (name, email, password) => {
        try {
            const { isSignUpComplete, nextStep } = await signUp({
                username: email,
                password,
                options: { userAttributes: { email, name } },
            })
            if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
                return { success: true, requiresVerification: true }
            }
            if (isSignUpComplete) return { success: true }
            return { success: false, error: "Signup failed" }
        } catch (error) {
            return { success: false, error: error.message || "Signup failed" }
        }
    }

    const confirmSignup = async (email, code) => {
        try {
            await confirmSignUp({ username: email, confirmationCode: code })
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message || "Verification failed" }
        }
    }

    const logout = async () => {
        try {
            clearTokenCache()
            await signOut()
            setUser(null)
            router.push("/login")
        } catch (error) {
            console.error("Logout error:", error)
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, confirmSignup, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error("useAuth must be used within an AuthProvider")
    return context
}