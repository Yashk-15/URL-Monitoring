"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    IconActivity,
} from "@tabler/icons-react"

function StatusBadge({ status }) {
    const map = {
        Up:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        Down:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        Warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        Unknown: "bg-muted text-muted-foreground",
    }
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? map.Unknown}`}>
            {status}
        </span>
    )
}

function DistTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const { name, count, pct } = payload[0].payload
    return (
        <div className="rounded-xl border bg-background shadow-xl px-3 py-2.5 text-sm min-w-[150px]">
            <p className="font-semibold mb-1">{name}</p>
            <p className="text-muted-foreground">{count} monitors — {pct}%</p>
        </div>
    )
}

function EmptyState({ message }) {
    return (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
            <IconActivity className="size-10 opacity-25" />
            <p className="text-sm font-medium">{message}</p>
        </div>
    )
}

export function AnalyticsTab({ data = [], loading = false }) {

    const total   = data.length
    const upCount = data.filter(u => u.status === "Up").length
    const downCount = data.filter(u => u.status === "Down").length
    const warnCount = data.filter(u => u.status === "Warning").length

    const avgResponseTime = total > 0
        ? Math.round(data.reduce((s, u) => s + (parseInt(u.responseTime) || 0), 0) / total)
        : 0

    const avgUptime = total > 0
        ? (data.reduce((s, u) => s + (parseFloat(u.uptime) || 0), 0) / total).toFixed(1)
        : "0.0"

    const fast   = data.filter(u => (parseInt(u.responseTime) || 0) < 300).length
    const normal = data.filter(u => { const r = parseInt(u.responseTime) || 0; return r >= 300 && r < 700 }).length
    const slow   = data.filter(u => (parseInt(u.responseTime) || 0) >= 700).length

    const distData = [
        { name: "Fast (<300ms)",   count: fast,   pct: total ? Math.round(fast   / total * 100) : 0, color: "#22c55e" },
        { name: "Normal (300–700ms)", count: normal, pct: total ? Math.round(normal / total * 100) : 0, color: "#f59e0b" },
        { name: "Slow (>700ms)",   count: slow,   pct: total ? Math.round(slow   / total * 100) : 0, color: "#ef4444" },
    ]

    const sortedByUptime = [...data].sort(
        (a, b) => parseFloat(b.uptime || 0) - parseFloat(a.uptime || 0)
    )

    const slowest = [...data]
        .filter(u => parseInt(u.responseTime) > 0)
        .sort((a, b) => parseInt(b.responseTime) - parseInt(a.responseTime))
        .slice(0, 5)

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="skeleton h-14 w-full rounded-xl" />
                <div className="grid grid-cols-1 gap-6 @xl/main:grid-cols-2">
                    <div className="skeleton h-64 rounded-xl" />
                    <div className="skeleton h-64 rounded-xl" />
                </div>
            </div>
        )
    }

    if (total === 0) return <EmptyState message="No monitors found. Add a URL to start tracking." />

    return (
        <div className="space-y-6">

            {}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-muted/30 px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">{upCount} Online</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">{downCount} Down</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="text-sm font-medium">{warnCount} Warning</span>
                </div>
                <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Avg uptime:</span>
                    <span className="font-semibold text-foreground">{avgUptime}%</span>
                    <span className="mx-1">·</span>
                    <span>Avg response:</span>
                    <span className={`font-semibold ${
                        avgResponseTime < 300 ? "text-green-600" :
                        avgResponseTime < 700 ? "text-yellow-600" : "text-red-600"
                    }`}>{avgResponseTime}ms</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 @xl/main:grid-cols-2">

                {}
                <Card>
                    <CardHeader>
                        <CardTitle>Uptime Breakdown</CardTitle>
                        <CardDescription>Per-monitor uptime percentage</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sortedByUptime.slice(0, 8).map(url => {
                            const pct = Math.min(100, Math.max(0, parseFloat(url.uptime) || 0))
                            return (
                                <div key={url.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <StatusBadge status={url.status} />
                                            <span className="text-sm font-medium truncate" title={url.name}>
                                                {url.name}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold tabular-nums shrink-0">
                                            {pct.toFixed(1)}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={pct}
                                        className="h-1.5"
                                    />
                                </div>
                            )
                        })}
                        {sortedByUptime.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No uptime data yet</p>
                        )}
                    </CardContent>
                </Card>

                {}
                <Card>
                    <CardHeader>
                        <CardTitle>Response Time Distribution</CardTitle>
                        <CardDescription>How your monitors are performing right now</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {total > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart
                                        data={distData}
                                        margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                                        barSize={48}
                                    >
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<DistTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                            {distData.map((entry) => (
                                                <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                {}
                                <div className="flex gap-4 mt-3 justify-center flex-wrap">
                                    {distData.map(d => (
                                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                                            {d.name}: <span className="font-semibold text-foreground">{d.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <EmptyState message="No response data yet" />
                        )}
                    </CardContent>
                </Card>
            </div>

            {}
            {slowest.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Slowest Monitors</CardTitle>
                        <CardDescription>Top 5 endpoints by average response time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0 divide-y divide-border">
                            {slowest.map((url, idx) => {
                                const ms = parseInt(url.responseTime) || 0
                                const color = ms < 300 ? "text-green-600" : ms < 700 ? "text-yellow-600" : "text-red-600"
                                return (
                                    <div key={url.id} className="flex items-center gap-4 py-3">
                                        <span className="text-sm font-bold text-muted-foreground w-5 text-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{url.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{url.url}</p>
                                        </div>
                                        <StatusBadge status={url.status} />
                                        <span className={`text-sm font-bold tabular-nums shrink-0 ${color}`}>
                                            {ms}ms
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
