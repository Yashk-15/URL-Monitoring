// API client with Cognito authentication
import { fetchAuthSession } from "aws-amplify/auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

if (!API_BASE) {
    console.error(
        '[api-client] NEXT_PUBLIC_API_BASE is not set! ' +
        'Add it to your .env.local file: ' +
        'NEXT_PUBLIC_API_BASE=https://gdo6x7ra5c.execute-api.ap-south-1.amazonaws.com'
    )
}

export const apiClient = {
    async request(endpoint, options = {}) {
        if (!API_BASE) {
            throw new Error('API base URL is not configured. Check NEXT_PUBLIC_API_BASE in .env.local')
        }

        try {
            // Get fresh Cognito token on every request
            const session = await fetchAuthSession()
            const token = session.tokens?.idToken?.toString()

            // If no token, session has expired — redirect to login
            if (!token) {
                console.warn('[api-client] No auth token found, redirecting to login')
                if (typeof window !== 'undefined') {
                    window.location.href = '/login'
                }
                throw new Error('No authentication token available')
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            }

            const url = `${API_BASE}${endpoint}`
            console.debug(`[api-client] ${options.method || 'GET'} ${url}`)

            const response = await fetch(url, {
                ...options,
                headers,
            })

            // Handle 401/403 — expired or invalid token
            if (response.status === 401 || response.status === 403) {
                console.warn('[api-client] Auth error, redirecting to login')
                if (typeof window !== 'undefined') {
                    window.location.href = '/login'
                }
                throw new Error(`Authentication failed: ${response.status}`)
            }

            return response
        } catch (error) {
            // Re-throw auth redirects
            if (error.message.includes('Authentication failed') ||
                error.message.includes('No authentication token')) {
                throw error
            }
            console.error('[api-client] Request error:', error)
            throw error
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' })
    },

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' })
    },
}

/**
 * Safely extract an array from various API response shapes:
 *   - Raw array:          [...]
 *   - Wrapped:            { data: [...] }
 *   - Wrapped alternate:  { urls: [...] }
 *   - Wrapped alternate:  { logs: [...] }
 *   - Single object:      {...}  → wrapped in []
 */
export function extractArray(result, keys = ['data', 'urls', 'logs', 'items']) {
    if (!result) return []
    if (Array.isArray(result)) return result
    if (typeof result === 'object') {
        for (const key of keys) {
            if (Array.isArray(result[key])) return result[key]
        }
        // Last resort: wrap single object
        return [result]
    }
    return []
}

/**
 * Normalise a URL record from DynamoDB/Lambda into the shape
 * all frontend components expect.
 *
 * DynamoDB primary key is URLid (String).
 * Lambda enriches with: status, responseTime, uptime, lastCheck, etc.
 */
export function normaliseURL(raw) {
    return {
        // Always use URLid as the canonical id
        id: raw.URLid || raw.id || '',
        name: raw.name || 'Unnamed URL',
        url: raw.url || '',
        enabled: raw.enabled ?? true,
        expectedStatus: raw.expectedStatus || 200,
        maxLatencyMs: raw.maxLatencyMs || 3000,
        timeoutSeconds: raw.timeoutSeconds || 5,
        region: raw.region || 'ap-south-1',

        // Health data — provided by Lambda when enriching from URL_Health_details
        status: raw.status || 'Unknown',                    // "Up" | "Down" | "Warning" | "Unknown"
        responseTime: String(raw.responseTime || '0'),       // ms as string for display
        uptime: String(raw.uptime || '0'),                   // percentage as string
        lastCheck: raw.lastCheck || raw.Timestamp || 'Never',
        statusCode: raw.statusCode || null,
        errorMsg: raw.errorMsg || raw.error || null,
        isUp: raw.isUp ?? null,
        isSlow: raw.isSlow ?? null,
    }
}

/**
 * Normalise a log record from URL_Health_details table.
 * PK = URLid, SK = Timestamp
 */
export function normaliseLog(raw) {
    return {
        urlId: raw.URLid || raw.urlId || '',
        timestamp: raw.Timestamp || raw.timestamp || '',
        // Lambda stores response time as latencyMs in URL_Health_details table
        responseTime: parseInt(raw.latencyMs || raw.responseTime || raw.ResponseTime || raw.LatencyMs || 0),
        statusCode: raw.statusCode || raw.StatusCode || null,
        status: raw.status || (raw.isUp ? 'Up' : 'Down') || 'Unknown',
        errorMsg: raw.errorMsg || raw.error || null,
        isUp: raw.isUp ?? true,
        isSlow: raw.isSlow ?? false,
    }
}