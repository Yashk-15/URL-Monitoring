// API client with Cognito authentication
import { fetchAuthSession } from "aws-amplify/auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

export const apiClient = {
    async request(endpoint, options = {}) {
        try {
            // Get Cognito token
            const session = await fetchAuthSession()
            const token = session.tokens?.idToken?.toString()

            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            }

            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            })

            return response
        } catch (error) {
            console.error('API request error:', error)
            throw error
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' })
    },

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' })
    }
}
