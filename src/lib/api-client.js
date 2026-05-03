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

// ─── Token Cache ───────────────────────────────────────────────────────────────
let _cachedToken = null
let _tokenExpiresAt = 0

async function getAuthToken() {
    const now = Date.now()
    if (_cachedToken && now < _tokenExpiresAt - 5 * 60 * 1000) {
        return _cachedToken
    }

    if (process.env.NODE_ENV === 'development') {
        console.debug('[api-client] Refreshing Cognito token...')
    }

    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()

    if (token) {
        _cachedToken = token
        _tokenExpiresAt = now + 60 * 60 * 1000
    } else {
        _cachedToken = null
        _tokenExpiresAt = 0
    }

    return token
}

/**
 * Call this on logout so the cached token from the previous session
 * is not reused if another user signs in on the same tab/window.
 */
export function clearTokenCache() {
    _cachedToken = null
    _tokenExpiresAt = 0
}

export const apiClient = {
    async request(endpoint, options = {}) {
        if (!API_BASE) {
            throw new Error('API base URL is not configured. Check NEXT_PUBLIC_API_BASE in .env.local')
        }

        try {
            const token = await getAuthToken()

            if (!token) {
                console.warn('[api-client] No auth token found, redirecting to login')
                if (typeof window !== 'undefined') {
                    window.location.replace('/login')
                }
                throw new Error('No authentication token available')
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            }

            const url = `${API_BASE}${endpoint}`
            if (process.env.NODE_ENV === 'development') {
                console.debug(`[api-client] ${options.method || 'GET'} ${url}`)
            }

            const response = await fetch(url, { ...options, headers })

            if (response.status === 401 || response.status === 403) {
                console.warn('[api-client] Auth error, redirecting to login')
                if (typeof window !== 'undefined') {
                    window.location.replace('/login')
                }
                throw new Error(`Authentication failed: ${response.status}`)
            }

            return response
        } catch (error) {
            if (error.message.includes('Authentication failed') ||
                error.message.includes('No authentication token')) {
                throw error
            }
            console.error('[api-client] Request error:', error)
            throw error
        }
    },

    async get(endpoint) { return this.request(endpoint, { method: 'GET' }) },
    async post(endpoint, data) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) })
    },
    async put(endpoint, data) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) })
    },
    async delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }) },
}

export function extractArray(result, keys = ['data', 'urls', 'logs', 'items']) {
    if (!result) return []
    if (Array.isArray(result)) return result
    if (typeof result === 'object') {
        for (const key of keys) {
            if (Array.isArray(result[key])) return result[key]
        }
        if (!result.message && !result.error && !result.errorMessage) {
            return [result]
        }
    }
    return []
}

export function normaliseURL(raw) {
    return {
        id: raw.URLid || raw.id || '',
        name: raw.name || 'Unnamed URL',
        url: raw.url || '',
        enabled: raw.enabled ?? true,
        expectedStatus: raw.expectedStatus || 200,
        maxLatencyMs: raw.maxLatencyMs || 3000,
        timeoutSeconds: raw.timeoutSeconds || 5,
        region: raw.region || 'ap-south-1',
        status: raw.status || 'Unknown',
        responseTime: String(raw.responseTime || '0'),
        uptime: String(raw.uptime || '0'),
        lastCheck: raw.lastCheck || raw.Timestamp || 'Never',
        statusCode: raw.statusCode || null,
        errorMsg: raw.errorMsg || raw.error || null,
        isUp: raw.isUp ?? null,
        isSlow: raw.isSlow ?? null,
    }
}

export function normaliseLog(raw) {
    return {
        urlId: raw.URLid || raw.urlId || '',
        timestamp: raw.Timestamp || raw.timestamp || '',
        responseTime: parseInt(raw.latencyMs || raw.responseTime || raw.ResponseTime || raw.LatencyMs || 0),
        statusCode: raw.statusCode || raw.StatusCode || null,
        status: raw.status || (raw.isUp != null ? (raw.isUp ? 'Up' : 'Down') : 'Unknown'),
        errorMsg: raw.errorMsg || raw.error || null,
        isUp: raw.isUp ?? true,
        isSlow: raw.isSlow ?? false,
    }
}