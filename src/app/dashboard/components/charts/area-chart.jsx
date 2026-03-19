"use client"

import * as React from "react"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

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

const CHART_COLOR = "#6366f1" // indigo

/**
 * Bucket ALL log entries (across all URLs) into time slots.
 * Each slot gets the cumulative average response time.
 * Null = no data that slot (renders as a gap, not a fake line).
 */
function bucketLogs(logs, timeRange) {
    const now = new Date()
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
    // Use hourly slots when there are ≤30 data points, else daily
    const useHourly = timeRange === "7d"
    const slotMs = useHourly ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const totalSlots = useHourly ? days * 12 : days
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const filtered = logs.filter((l) => {
        const ts = new Date(l.timestamp)
        return ts >= cutoff && ts <= now
    })

    const bySlot = {}
    for (const log of filtered) {
        const ts = new Date(log.timestamp)
        const idx = Math.floor((ts.getTime() - cutoff.getTime()) / slotMs)
        if (idx < 0 || idx >= totalSlots) continue
        if (!bySlot[idx]) bySlot[idx] = []
        bySlot[idx].push(log.responseTime)
    }

    const result = []
    for (let i = 0; i < totalSlots; i++) {
        const slotStart = new Date(cutoff.getTime() + i * slotMs)
        const values = bySlot[i] || []
        if (values.length === 0) {
            result.push({ date: slotStart.toISOString(), avg: null, min: null, max: null, count: 0 })
        } else {
            const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length)
            result.push({
                date: slotStart.toISOString(),
                avg,
                min: Math.min(...values),
                max: Math.max(...values),
                count: values.length,
            })
        }
    }
    return result
}

function formatTick(isoStr, timeRange) {
    const d = new Date(isoStr)
    if (timeRange === "7d") {
        return (
            d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
            " " +
            d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })
        )
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Custom tooltip that shows url name + stats
function CustomTooltip({ active, payload, label, timeRange }) {
    if (!active || !payload?.length) return null
    const d = new Date(label)
    const dateStr = d.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: timeRange === "7d" ? "numeric" : undefined,
        minute: timeRange === "7d" ? "2-digit" : undefined,
    })
    return (
        <div className="rounded-xl border bg-background shadow-xl px-3 py-2.5 text-sm min-w-[160px]">
            <p className="text-muted-foreground text-xs mb-2 font-medium">{dateStr}</p>
            {payload.map((p) => {
                const { avg, min, max, count } = p.payload
                if (avg === null) return null
                return (
                    <div key={p.dataKey} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
                                <span className="font-semibold">{avg}ms</span>
                            </span>
                            <span className="text-muted-foreground text-xs">{count} check{count !== 1 ? "s" : ""}</span>
                        </div>
                        {min !== max && (
                            <p className="text-muted-foreground text-xs">
                                Range: {min}ms – {max}ms
                            </p>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// Empty state illustration
function EmptyState({ message, sub }) {
    return (
        <div className="h-[250px] flex flex-col items-center justify-center gap-3 text-muted-foreground select-none">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-30">
                <rect x="4" y="32" width="6" height="12" rx="2" fill="currentColor" />
                <rect x="14" y="22" width="6" height="22" rx="2" fill="currentColor" />
                <rect x="24" y="14" width="6" height="30" rx="2" fill="currentColor" />
                <rect x="34" y="26" width="6" height="18" rx="2" fill="currentColor" />
                <path d="M6 28 L16 20 L26 10 L36 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-center">
                <p className="text-sm font-medium">{message}</p>
                {sub && <p className="text-xs mt-0.5 max-w-xs">{sub}</p>}
            </div>
        </div>
    )
}

export function ChartAreaInteractive({ data: urlData = [] }) {
    const isMobile = useIsMobile()
    const [timeRange, setTimeRange] = React.useState("7d")
    const [logs, setLogs] = React.useState([])
    const [loadingLogs, setLoadingLogs] = React.useState(false)
    const [logsError, setLogsError] = React.useState(null)

    React.useEffect(() => {
        if (isMobile) setTimeRange("7d")
    }, [isMobile])

    const urlIdString = React.useMemo(
        () =>
            (urlData || [])
                .map((u) => u.id || u.URLid)
                .filter(Boolean)
                .sort()
                .join(","),
        [urlData]
    )

    React.useEffect(() => {
        if (!urlIdString) return

        async function fetchLogsForURLs() {
            setLoadingLogs(true)
            setLogsError(null)

            const urlsToFetch = (urlData || [])
                .filter((u) => u.id || u.URLid)
                .slice(0, 5) // max 5 URLs for performance

            try {
                let firstError = null
                const results = await Promise.all(
                    urlsToFetch.map(async (url) => {
                        const urlId = url.id || url.URLid
                        try {
                            const response = await apiClient.get(
                                `/logs?urlId=${encodeURIComponent(urlId)}`
                            )
                            if (!response.ok) {
                                if (!firstError) firstError = `HTTP ${response.status}`
                                return []
                            }
                            const result = await response.json()
                            return extractArray(result).map((l) => ({
                                ...normaliseLog(l),
                                urlId,
                                urlName: url.name || url.url || urlId,
                            }))
                        } catch (err) {
                            if (!firstError) firstError = err.message || "unknown"
                            return []
                        }
                    })
                )

                if (firstError) setLogsError(firstError)
                setLogs(results.flat())
            } finally {
                setLoadingLogs(false)
            }
        }

        fetchLogsForURLs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlIdString])

    // Single cumulative chartData — all URLs bucketed together
    const chartData = React.useMemo(() => {
        if (!logs.length) return []
        return bucketLogs(logs, timeRange)
    }, [logs, timeRange])

    const hasData = chartData.some((d) => d.avg !== null)

    const avgAll = React.useMemo(() => {
        const vals = chartData.filter((d) => d.avg !== null).map((d) => d.avg)
        return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null
    }, [chartData])

    // Y-axis: scale to 20% above the peak value
    const yMax = React.useMemo(() => {
        const peak = Math.max(0, ...chartData.map((d) => d.avg ?? 0))
        return peak ? Math.ceil(peak * 1.2) : 500
    }, [chartData])

    const subtitle = loadingLogs && !logs.length
        ? "Loading historical data..."
        : logsError
            ? `⚠ ${logsError}`
            : hasData
                ? `${avgAll}ms average across all monitors`
                : "No history yet — data appears once monitors start checking"

    return (
        <Card className="@container/card">
            <CardHeader>
                <div>
                    <CardTitle>Response Time Trends</CardTitle>
                    <CardDescription className="mt-1">{subtitle}</CardDescription>
                </div>
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
                            className="flex w-40 rounded-lg sm:ml-auto @[767px]/card:hidden"
                            aria-label="Select time range"
                        >
                            <SelectValue placeholder="Last 7 days" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="90d">Last 3 months</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>

            <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
                {loadingLogs && !logs.length ? (
                    <div className="h-[250px] flex items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2" />
                            <p className="text-sm text-muted-foreground">Loading chart data...</p>
                        </div>
                    </div>
                ) : !hasData ? (
                    <EmptyState
                        message="No response time data yet"
                        sub="Charts populate automatically as your monitors run. Check back in a few minutes."
                    />
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="fillAvg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={CHART_COLOR} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid
                                    vertical={false}
                                    strokeDasharray="3 3"
                                    stroke="var(--border)"
                                    opacity={0.5}
                                />

                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    minTickGap={timeRange === "7d" ? 80 : 40}
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                    tickFormatter={(v) => formatTick(v, timeRange)}
                                />

                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                    tickFormatter={(v) => `${v}ms`}
                                    width={58}
                                    domain={[0, yMax]}
                                />

                                <Tooltip
                                    content={<CustomTooltip timeRange={timeRange} />}
                                    cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                                />

                                {/* Warning threshold line at 1000ms */}
                                {yMax > 800 && (
                                    <ReferenceLine
                                        y={1000}
                                        stroke="#f59e0b"
                                        strokeDasharray="4 4"
                                        strokeOpacity={0.5}
                                        label={{ value: "1s threshold", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }}
                                    />
                                )}

                                <Area
                                    dataKey="avg"
                                    type="monotoneX"
                                    fill="url(#fillAvg)"
                                    stroke={CHART_COLOR}
                                    strokeWidth={2}
                                    connectNulls={false}
                                    dot={(props) => {
                                        if (!props.payload?.count) return null
                                        return (
                                            <circle
                                                key={props.key}
                                                cx={props.cx}
                                                cy={props.cy}
                                                r={3.5}
                                                fill={CHART_COLOR}
                                                stroke="white"
                                                strokeWidth={1.5}
                                            />
                                        )
                                    }}
                                    activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
