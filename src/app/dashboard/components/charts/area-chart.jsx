"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ToggleGroup,
    ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { apiClient, extractArray, normaliseLog } from "@/lib/api-client"

const chartConfig = {
    avgResponseTime: {
        label: "Avg Response (ms)",
        color: "var(--primary)",
    },
    maxResponseTime: {
        label: "Max Response (ms)",
        color: "var(--chart-2)",
    },
}

/**
 * Bucket log entries by day and compute avg + max response time per day.
 * Returns an array sorted oldest → newest, one entry per day.
 */
function bucketByDay(logs, days) {
    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - days)

    // Filter to the time window
    const filtered = logs.filter((log) => {
        const ts = new Date(log.timestamp)
        return ts >= cutoff && ts <= now
    })

    // Group by YYYY-MM-DD
    const byDay = {}
    for (const log of filtered) {
        const date = new Date(log.timestamp).toISOString().split('T')[0]
        if (!byDay[date]) byDay[date] = []
        byDay[date].push(log.responseTime)
    }

    // Fill every day in the window so the chart has no gaps
    const result = []
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const date = d.toISOString().split('T')[0]
        const values = byDay[date] || []
        result.push({
            date,
            avgResponseTime: values.length
                ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
                : null,
            maxResponseTime: values.length ? Math.max(...values) : null,
            checkCount: values.length,
        })
    }
    return result
}

export function ChartAreaInteractive({ data: urlData = [] }) {
    const isMobile = useIsMobile()
    const [timeRange, setTimeRange] = React.useState("30d")
    const [logs, setLogs] = React.useState([])
    const [loadingLogs, setLoadingLogs] = React.useState(false)
    const [logsError, setLogsError] = React.useState(null)

    React.useEffect(() => {
        if (isMobile) setTimeRange("7d")
    }, [isMobile])

    /**
     * Stable dependency: a sorted, comma-joined string of URL IDs.
     * This only changes when the actual set of monitored URLs changes,
     * NOT on every 30-second auto-refresh that returns the same IDs.
     */
    const urlIdString = React.useMemo(
        () => (urlData || []).map((u) => u.id || u.URLid).filter(Boolean).sort().join(','),
        [urlData]
    )

    React.useEffect(() => {
        if (!urlIdString) return

        async function fetchLogsForURLs() {
            setLoadingLogs(true)
            setLogsError(null)

            // Lambda requires ?urlId=X — fetch per URL in parallel (up to 5)
            const urlsToFetch = (urlData || []).filter((u) => u.id || u.URLid).slice(0, 5)
            console.log('[Chart] Fetching logs for', urlsToFetch.length, 'URLs:', urlsToFetch.map(u => u.id || u.URLid))

            try {
                let firstError = null

                const results = await Promise.all(
                    urlsToFetch.map(async (url) => {
                        const urlId = url.id || url.URLid
                        try {
                            // Lambda: GET /logs?urlId=X — ownership verified server-side
                            const response = await apiClient.get(`/logs?urlId=${encodeURIComponent(urlId)}`)
                            console.log(`[Chart] /logs?urlId=${urlId} → HTTP ${response.status}`)
                            if (!response.ok) {
                                let body = ''
                                try { body = await response.text() } catch { }
                                console.warn(`[Chart] /logs error body (${response.status}):`, body)
                                if (!firstError) {
                                    if (response.status === 400) firstError = 'badrequest'
                                    else if (response.status === 404) firstError = 'notfound'
                                    else if (response.status === 401 || response.status === 403) firstError = 'auth'
                                    else firstError = `HTTP ${response.status}`
                                }
                                return []
                            }
                            const result = await response.json()
                            console.log(`[Chart] /logs?urlId=${urlId} →`, Array.isArray(result) ? result.length : result, 'entries')
                            return extractArray(result).map(normaliseLog)
                        } catch (err) {
                            const isCors = err instanceof TypeError && err.message.includes('fetch')
                            console.error(`[Chart] fetch error for ${urlId}:`, err)
                            if (!firstError) firstError = isCors ? 'cors' : err.message || 'unknown'
                            return []
                        }
                    })
                )

                if (firstError) {
                    console.warn('[Chart] logsError:', firstError)
                    setLogsError(firstError)
                }

                const allLogs = results.flat()
                console.log('[Chart] Total log entries:', allLogs.length, allLogs[0])
                setLogs(allLogs)
            } finally {
                setLoadingLogs(false)
            }
        }

        fetchLogsForURLs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlIdString])

    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90

    const chartData = React.useMemo(() => {
        if (logs.length === 0) return []
        return bucketByDay(logs, days)
    }, [logs, days])

    // Only show days that have data, but keep all days for continuity
    const hasData = chartData.some((d) => d.avgResponseTime !== null)

    const avgAll = hasData
        ? Math.round(
            chartData
                .filter((d) => d.avgResponseTime !== null)
                .reduce((s, d) => s + d.avgResponseTime, 0) /
            chartData.filter((d) => d.avgResponseTime !== null).length
        )
        : null

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
                <CardDescription>
                    {loadingLogs
                        ? "Loading historical data..."
                        : logsError === 'cors'
                            ? "⚠ CORS error on /logs — configure in API Gateway"
                            : logsError === 'badrequest'
                                ? "⚠ /logs returned 400 — check Lambda query param support"
                                : logsError === 'notfound'
                                    ? "⚠ /logs route not found — check Lambda deployment"
                                    : logsError && logsError !== 'auth'
                                        ? `⚠ ${logsError} — check browser console for details`
                                        : hasData
                                            ? `${avgAll}ms average across all monitors`
                                            : "No log data yet — history appears once monitors run"}
                </CardDescription>
                <CardAction>
                    <ToggleGroup
                        type="single"
                        value={timeRange}
                        onValueChange={(v) => v && setTimeRange(v)}
                        variant="outline"
                        className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
                    >
                        <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
                        <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
                        <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
                    </ToggleGroup>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger
                            className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                            size="sm"
                            aria-label="Select time range"
                        >
                            <SelectValue placeholder="Last 30 days" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {loadingLogs ? (
                    <div className="h-[250px] flex items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2" />
                            <p className="text-sm text-muted-foreground">Loading chart data...</p>
                        </div>
                    </div>
                ) : !hasData ? (
                    <div className="h-[250px] flex items-center justify-center">
                        <div className="text-center text-muted-foreground max-w-sm px-4">
                            {logsError === 'cors' ? (
                                <>
                                    <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                                        CORS error on /logs
                                    </p>
                                    <p className="text-xs">
                                        Go to API Gateway → CORS, enable OPTIONS for /logs, then redeploy.
                                    </p>
                                </>
                            ) : logsError === 'badrequest' ? (
                                <>
                                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">
                                        /logs returned 400 Bad Request
                                    </p>
                                    <p className="text-xs">
                                        The Lambda rejected the query. Check what parameters
                                        your /logs Lambda expects (e.g. urlId format, required fields).
                                    </p>
                                </>
                            ) : logsError === 'notfound' ? (
                                <>
                                    <p className="text-sm font-semibold mb-1">Route not found (404)</p>
                                    <p className="text-xs">/logs returned 404. Check your Lambda is deployed and route integration is set.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-medium mb-1">No data for this period</p>
                                    <p className="text-xs">Response time history will appear here as checks run.</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="fillAvg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-avgResponseTime)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-avgResponseTime)" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="fillMax" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-maxResponseTime)" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="var(--color-maxResponseTime)" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tickFormatter={(value) =>
                                    new Date(value).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    })
                                }
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(v) => `${v}ms`}
                                width={55}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(value) =>
                                            new Date(value).toLocaleDateString("en-US", {
                                                weekday: "short",
                                                month: "short",
                                                day: "numeric",
                                            })
                                        }
                                        formatter={(value, name) => [
                                            `${value}ms`,
                                            name === "avgResponseTime" ? "Avg Response" : "Max Response",
                                        ]}
                                        indicator="dot"
                                    />
                                }
                            />
                            <Area
                                dataKey="maxResponseTime"
                                type="monotone"
                                fill="url(#fillMax)"
                                stroke="var(--color-maxResponseTime)"
                                strokeWidth={1}
                                strokeDasharray="4 2"
                                connectNulls={false}
                            />
                            <Area
                                dataKey="avgResponseTime"
                                type="monotone"
                                fill="url(#fillAvg)"
                                stroke="var(--color-avgResponseTime)"
                                strokeWidth={2}
                                connectNulls={false}
                            />
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
