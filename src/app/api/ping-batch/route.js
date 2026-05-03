/**
 * POST /api/ping-batch  (Streaming via Server-Sent Events)
 *
 * Body: { urls: [{ id, url }] }
 *
 * Streams each result as an SSE event the moment it resolves.
 * All URLs are pinged in parallel server-side — far more efficient
 * than 75 individual /api/ping calls from the browser.
 *
 * Event format:  data: { id, status, responseTime, statusCode, errorMsg }\n\n
 */

const TIMEOUT_MS      = 8000
const LATENCY_WARNING = 1500

/**
 * SSRF guard — identical to the one in /api/ping/route.js.
 * Only http/https URLs may be fetched. Returns null for anything else
 * (file://, internal metadata IPs, malformed strings, etc.).
 */
function validateURL(url) {
    if (!url || typeof url !== 'string') return null
    try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) return null
        return parsed
    } catch {
        return null
    }
}

async function pingOne(url) {
    // Reject any non-http/https or malformed URL before making a network call
    if (!validateURL(url)) {
        return {
            status: 'Down',
            responseTime: 0,
            statusCode: null,
            errorMsg: 'INVALID_URL',
        }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const start = Date.now()
    try {
        const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' })
        clearTimeout(timer)
        const latencyMs = Date.now() - start
        // Bug 1 fix: use res.ok (2xx only) so a URL that redirects to a login
        // page (302 → 200) is correctly reported as Down, not Up.
        const isUp = res.ok
        return {
            status: isUp ? (latencyMs > LATENCY_WARNING ? 'Warning' : 'Up') : 'Down',
            responseTime: latencyMs,
            statusCode: res.status,
            errorMsg: null,
        }
    } catch (err) {
        clearTimeout(timer)
        const latencyMs = Date.now() - start
        const isTimeout = err?.name === 'AbortError'
        return {
            status: 'Down',
            responseTime: latencyMs,
            statusCode: null,
            errorMsg: isTimeout ? 'TIMEOUT' : (err?.message || 'ERROR'),
        }
    }
}

export async function POST(request) {
    let body
    try { body = await request.json() } catch {
        return new Response('Invalid JSON', { status: 400 })
    }

    const urls = body?.urls
    if (!Array.isArray(urls) || urls.length === 0) {
        return new Response('urls array required', { status: 400 })
    }

    // Create a ReadableStream that pings all URLs in parallel and
    // writes an SSE event for each result as soon as it arrives.
    const stream = new ReadableStream({
        async start(controller) {
            const enc = new TextEncoder()

            const send = (data) => {
                try {
                    controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
                } catch { /* stream may already be closed */ }
            }

            // Ping all in parallel — validation happens inside pingOne()
            await Promise.allSettled(
                urls.map(async ({ id, url }) => {
                    const result = await pingOne(url)
                    send({ id, ...result })
                })
            )

            // Signal completion
            controller.enqueue(enc.encode('data: {"done":true}\n\n'))
            controller.close()
        }
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    })
}
