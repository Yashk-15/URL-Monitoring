/**
 * POST /api/ping
 *
 * Server-side URL health check proxy. The browser can't fetch arbitrary
 * third-party URLs directly (CORS), but a Next.js API route can.
 *
 * Body: { url: string, timeoutSeconds?: number }
 * Response: { isUp, statusCode, latencyMs, errorMsg }
 */
export async function POST(request) {
    let body
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { url, timeoutSeconds = 10 } = body

    if (!url || typeof url !== 'string') {
        return Response.json({ error: 'url is required' }, { status: 400 })
    }

    // Basic sanity check — must be http/https
    try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return Response.json({ error: 'Only http/https URLs are supported' }, { status: 400 })
        }
    } catch {
        return Response.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000)
    const start = Date.now()

    try {
        const res = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            // Don't follow too many redirects; limit to 5
            redirect: 'follow',
        })
        clearTimeout(timeout)
        const latencyMs = Date.now() - start

        return Response.json({
            isUp: true,
            statusCode: res.status,
            latencyMs,
            errorMsg: null,
        })
    } catch (err) {
        clearTimeout(timeout)
        const latencyMs = Date.now() - start

        const isTimeout = err?.name === 'AbortError'
        return Response.json({
            isUp: false,
            statusCode: null,
            latencyMs,
            errorMsg: isTimeout ? 'TIMEOUT' : (err?.message || 'UNKNOWN_ERROR'),
        })
    }
}
