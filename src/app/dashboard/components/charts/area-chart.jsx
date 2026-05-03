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

const CHART_COLOR = "#6366f1"

function parseTimestamp(ts) {
    if (!ts) return null
    if (typeof ts === 'number') {
        return new Date(ts < 1e10 ? ts * 1000 : ts)
    }
    if (/^\d+$/.test(String(ts))) {
        const n = Number(ts)
        return new Date(n < 1e10 ? n * 1000 : n)
    }
    const d = new Date(ts)
    return isNaN(d.getTime()) ? null : d
}

function daysForRange(range) {
    return range === "7d" ? 7 : range === "30d" ? 30 : 90
}
function cutoffForRange(range) {
    const now = new Date()
    return new Date(now.getTime() - daysForRange(range) * 24 * 60 * 60 * 1000)
}
function startDateParam(range) {
    return cutoffForRange(range).toISOString()
}

function bucketLogs(logs, timeRange) {
    const now = new Date()
    const days = daysForRange(timeRange)
    const slotMs =
        timeRange === "7d"
            ? 2 * 60 * 60 * 1000
            : timeRange === "30d"
                ? 6 * 60 * 60 * 1000
                : 24 * 60 * 60 * 1000
    const totalSlots =
        timeRange === "7d"
            ? days * 12
            : timeRange === "30d"
                ? days * 4
                : days
    const cutoff = cutoffForRange(timeRange)

    const filtered = []
    for (const l of logs) {
        const ts = parseTimestamp(l.timestamp)
        if (ts && ts >= cutoff && ts <= now) {
            filtered.push({ ...l, _ts: ts })
        }
    }

    const bySlot = {}
    for (const log of filtered) {
        const idx = Math.floor((log._ts.getTime() - cutoff.getTime()) / slotMs)
        if (idx < 0 || idx >= totalSlots) continue
        if (!bySlot[idx]) bySlot[idx] = []
        if (log.responseTime != null && log.responseTime > 0) bySlot[idx].push(log.responseTime)
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

function CustomTooltip({ active, payload, label, timeRange }) {
    if (!active || !payload?.length) return null
    const d = new Date(label)
    const dateStr = d.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: timeRange !== "90d" ? "numeric" : undefined,
        minute: timeRange !== "90d" ? "2-digit" : undefined,
    })
    return (
        <div className="rounded-xl border bg-background shadow-xl px-3 py-2.5 text-sm min-w-[180px]">
            <p className="text-muted-foreground text-xs mb-2 font-medium">{dateStr}</p>
            {payload.map((p) => {
                const { avg, min, max, count } = p.payload
                if (avg === null) return null
                return (
                    <div key={p.dataKey} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                                <span className="font-semibold text-base">{avg}ms</span>
                            </span>
                            <span className="text-muted-foreground text-xs">{count} check{count !== 1 ? "s" : ""}</span>
                        </div>
                        {min !== max && (
                            <p className="text-muted-foreground text-xs">
                                Range: {min}ms – {max}ms
                            </p>
                        )}
                        <div className="flex gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${avg < 300 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : avg < 700 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {avg < 300 ? 'Fast' : avg < 700 ? 'Normal' : 'Slow'}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function EmptyState({ message, sub, icon }) {
    return (
        <div className="h-[280px] flex flex-col items-center justify-center gap-3 text-muted-foreground select-none">
            {icon || (
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-25">
                    <rect x="4" y="32" width="6" height="12" rx="2" fill="currentColor" />
                    <rect x="14" y="22" width="6" height="22" rx="2" fill="currentColor" />
                    <rect x="24" y="14" width="6" height="30" rx="2" fill="currentColor" />
                    <rect x="34" y="26" width="6" height="18" rx="2" fill="currentColor" />
                    <path d="M6 28 L16 20 L26 10 L36 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            <div className="text-center">
                <p className="text-sm font-medium">{message}</p>
                {sub && <p className="text-xs mt-1 max-w-xs text-muted-foreground/70">{sub}</p>}
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
    const [totalLogCount, setTotalLogCount] = React.useState(0)

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

        let cancelled = false

        async function fetchLogsForURLs() {
            setLoadingLogs(true)
            setLogsError(null)

            const urlsToFetch = (urlData || [])
                .filter((u) => u.id || u.URLid)
                .slice(0, 5)

            const startDate = startDateParam(timeRange)
            const limit = 500

            try {
                let firstError = null
                const results = await Promise.all(
                    urlsToFetch.map(async (url) => {
                        const urlId = url.id || url.URLid
                        try {
                            const qs = new URLSearchParams({
                                urlId: urlId,
                                startDate,
                                limit: String(limit),
                            })
                            const response = await apiClient.get(`/logs?${qs.toString()}`)
                            if (!response.ok) {
                                if (!firstError) firstError = `HTTP ${response.status}`
                                return []
                            }
                            const result = await response.json()
                            return extractArray(result).map((l) => ({
                                ...normaliseLog(l),
                                timestamp: l.Timestamp || l.timestamp || normaliseLog(l).timestamp,
                                urlId,
                                urlName: url.name || url.url || urlId,
                            }))
                        } catch (err) {
                            if (!firstError) firstError = err.message || "unknown"
                            return []
                        }
                    })
                )

                if (cancelled) return
                if (firstError) setLogsError(firstError)
                const allLogs = results.flat()
                setLogs(allLogs)
                setTotalLogCount(allLogs.length)
            } finally {
                if (!cancelled) setLoadingLogs(false)
            }
        }

        fetchLogsForURLs()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlIdString, timeRange])

    const chartData = React.useMemo(() => {
        if (!logs.length) return []
        return bucketLogs(logs, timeRange)
    }, [logs, timeRange])

    const hasData = chartData.some((d) => d.avg !== null)

    const populatedSlots = chartData.filter((d) => d.avg !== null).length

    const avgAll = React.useMemo(() => {
        const vals = chartData.filter((d) => d.avg !== null).map((d) => d.avg)
        return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null
    }, [chartData])

    const yMax = React.useMemo(() => {
        const peak = Math.max(0, ...chartData.map((d) => d.avg ?? 0))
        return peak ? Math.ceil(peak * 1.2) : 500
    }, [chartData])

    const perfBand = avgAll !== null
        ? avgAll < 300 ? "text-green-600 dark:text-green-400"
            : avgAll < 700 ? "text-yellow-600 dark:text-yellow-400"
                : "text-red-600 dark:text-red-400"
        : "text-muted-foreground"

    const subtitle = loadingLogs
        ? "Fetching historical data…"
        : logsError
            ? `⚠ ${logsError} — showing ${totalLogCount} cached log entries`
            : hasData
                ? `${avgAll}ms avg · ${totalLogCount} checks across ${populatedSlots} time slots`
                : "No response time history in this period"

    return (
        <Card className="@container/card">
            <CardHeader>
                <div>
                    <CardTitle>Response Time Trends</CardTitle>
                    <CardDescription className={`mt-1 ${hasData ? perfBand : ''}`}>
                        {subtitle}
                    </CardDescription>
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
                {loadingLogs ? (
                    <div className="h-[280px] flex items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-7 w-7 border-[3px] border-primary border-b-transparent mb-3" />
                            <p className="text-sm text-muted-foreground">Loading chart data…</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Fetching up to 500 entries per monitor</p>
                        </div>
                    </div>
                ) : !hasData ? (
                    <EmptyState
                        message="No response time data for this period"
                        sub={
                            totalLogCount > 0
                                ? `${totalLogCount} log entries found but none have valid timestamps in this range.`
                                : "Charts populate automatically as your monitors run."
                        }
                    />
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="fillAvg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={0.25} />
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
                                minTickGap={timeRange === "7d" ? 80 : 50}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                tickFormatter={(v) => formatTick(v, timeRange)}
                            />

                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                tickFormatter={(v) => `${v}ms`}
                                width={62}
                                domain={[0, yMax]}
                            />

                            <Tooltip
                                content={<CustomTooltip timeRange={timeRange} />}
                                cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                            />

                            {}
                            {yMax > 800 && (
                                <ReferenceLine
                                    y={1000}
                                    stroke="#f59e0b"
                                    strokeDasharray="4 4"
                                    strokeOpacity={0.6}
                                    label={{ value: "1s threshold", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }}
                                />
                            )}

                            <Area
                                dataKey="avg"
                                type="monotoneX"
                                fill="url(#fillAvg)"
                                stroke={CHART_COLOR}
                                strokeWidth={2.5}
                                connectNulls={false}
                                dot={(props) => {
                                    if (!props.payload?.count) return null
                                    const ms = props.payload.avg
                                    const fill = ms < 300 ? "#22c55e" : ms < 700 ? "#f59e0b" : "#ef4444"
                                    return (
                                        <circle
                                            key={props.key}
                                            cx={props.cx}
                                            cy={props.cy}
                                            r={4}
                                            fill={fill}
                                            stroke="white"
                                            strokeWidth={1.5}
                                        />
                                    )
                                }}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: "white", fill: CHART_COLOR }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
