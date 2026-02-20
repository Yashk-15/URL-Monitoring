"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signUp, signIn, signOut, getCurrentUser, confirmSignUp, fetchUserAttributes } from "aws-amplify/auth"
import "../lib/amplify-config"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    // Check for existing session on mount
    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        try {
            const currentUser = await getCurrentUser()
            // Fetch real user attributes (name, email) set during sign-up
            let attrs = {}
            try {
                attrs = await fetchUserAttributes()
            } catch {
                // fetchUserAttributes can fail in some edge cases — fall back gracefully
            }
            const email = attrs.email || currentUser.signInDetails?.loginId || ''
            // Use the 'name' attribute if set, otherwise derive from email
            const name = attrs.name || email.split('@')[0] || 'User'

            setUser({
                id: currentUser.userId,
                email,
                name,
            })
        } catch (error) {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        try {
            const { isSignedIn } = await signIn({
                username: email,
                password: password,
            })

            if (isSignedIn) {
                await checkUser()
                return { success: true }
            }

            return { success: false, error: "Login failed" }
        } catch (error) {
            console.error("Login error:", error)
            return {
                success: false,
                error: error.message || "Invalid email or password"
            }
        }
    }

    const signup = async (name, email, password) => {
        try {
            const { isSignUpComplete, userId, nextStep } = await signUp({
                username: email,
                password: password,
                options: {
                    userAttributes: {
                        email: email,
                        name: name,
                    },
                },
            })

            if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
                return {
                    success: true,
                    requiresVerification: true,
                    message: "Please check your email for verification code"
                }
            }

            if (isSignUpComplete) {
                return { success: true }
            }

            return { success: false, error: "Signup failed" }
        } catch (error) {
            console.error("Signup error:", error)
            return {
                success: false,
                error: error.message || "Signup failed"
            }
        }
    }

    const confirmSignup = async (email, code) => {
        try {
            await confirmSignUp({
                username: email,
                confirmationCode: code,
            })
            return { success: true }
        } catch (error) {
            console.error("Confirmation error:", error)
            return {
                success: false,
                error: error.message || "Verification failed"
            }
        }
    }

    const logout = async () => {
        try {
            await signOut()
            setUser(null)
            router.push("/login")
        } catch (error) {
            console.error("Logout error:", error)
        }
    }


    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            signup,
            confirmSignup,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
