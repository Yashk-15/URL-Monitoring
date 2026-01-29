// API utility functions for authenticated requests

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api"

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise} Response data
 */
export async function authenticatedFetch(endpoint, options = {}) {
    const token = localStorage.getItem("token")

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(error.message || "API request failed")
    }

    return response.json()
}

/**
 * Login user
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise} User data and token
 */
export async function loginUser(email, password) {
    // When backend is ready, uncomment this:
    // return authenticatedFetch("/auth/login", {
    //     method: "POST",
    //     body: JSON.stringify({ email, password }),
    // })

    // Mock response for now
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                user: {
                    id: Date.now().toString(),
                    name: email.split("@")[0],
                    email: email,
                },
                token: btoa(JSON.stringify({ userId: Date.now(), exp: Date.now() + 86400000 }))
            })
        }, 500)
    })
}

/**
 * Register new user
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise} User data and token
 */
export async function signupUser(name, email, password) {
    // When backend is ready, uncomment this:
    // return authenticatedFetch("/auth/signup", {
    //     method: "POST",
    //     body: JSON.stringify({ name, email, password }),
    // })

    // Mock response for now
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                user: {
                    id: Date.now().toString(),
                    name: name,
                    email: email,
                },
                token: btoa(JSON.stringify({ userId: Date.now(), exp: Date.now() + 86400000 }))
            })
        }, 500)
    })
}

/**
 * Get user's monitored URLs
 * @returns {Promise} Array of URLs
 */
export async function getUserURLs() {
    const token = localStorage.getItem("token")
    if (!token) {
        throw new Error("Not authenticated")
    }

    // When backend is ready, use this:
    // return authenticatedFetch("/urls")

    // For now, return mock data or fetch from existing endpoint
    const response = await fetch(`${API_BASE}/urls`)
    return response.json()
}
