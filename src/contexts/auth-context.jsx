"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    // Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem("token")
        const userData = localStorage.getItem("user")

        if (token && userData) {
            setUser(JSON.parse(userData))
        }
        setLoading(false)
    }, [])

    const login = async (email, password) => {
        try {
            // Mock login - replace with actual API call
            const mockUser = {
                id: "1",
                name: "John Doe",
                email: email,
            }

            const mockToken = "mock-jwt-token-" + Date.now()

            localStorage.setItem("token", mockToken)
            localStorage.setItem("user", JSON.stringify(mockUser))
            setUser(mockUser)

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const signup = async (name, email, password) => {
        try {
            // Mock signup - replace with actual API call
            const mockUser = {
                id: "1",
                name: name,
                email: email,
            }

            const mockToken = "mock-jwt-token-" + Date.now()

            localStorage.setItem("token", mockToken)
            localStorage.setItem("user", JSON.stringify(mockUser))
            setUser(mockUser)

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const logout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setUser(null)
        router.push("/login")
    }

    const getToken = () => {
        return localStorage.getItem("token")
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, getToken }}>
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
