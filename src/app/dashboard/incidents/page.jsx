"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { IncidentTimeline } from "./components/incident-timeline"
import { IconAlertTriangle } from "@tabler/icons-react"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { apiClient, extractArray, normaliseLog, normaliseURL } from "@/lib/api-client"

/**
 * Build incident records from log history (historical failures).
 */
function deriveIncidents(logs, urlMap) {
    const failures = logs.filter((log) => {
        return (
            !log.isUp ||
            log.status === "Down" ||
            log.status === "down" ||
            log.status === "Error" ||
            (log.statusCode && log.statusCode >= 400)
        )
    })

    return failures.map((log, index) => {
        const urlInfo = urlMap[log.urlId] || {}
        const urlName = urlInfo.name || log.urlId || "Unknown URL"
        const urlHref = urlInfo.url || ""

        // Severity: 5xx errors or definitively down → critical.
        // 4xx client errors or slow responses → warning.
        // We don't rely on !log.isUp alone because normaliseLog defaults isUp to
        // true when the field is absent, which would cause unknown records to never
        // be classified as critical.
        let severity = 'warning'
        if (!log.isUp || (log.statusCode && log.statusCode >= 500)) severity = 'critical'
        else if (log.isSlow || (log.statusCode && log.statusCode >= 400)) severity = 'warning'

        const statusText = log.statusCode ? `HTTP ${log.statusCode}` : log.status || "Unreachable"

        return {
            id: `${log.urlId}-${log.timestamp}-${index}`,
            title: `${urlName} — ${statusText}`,
            description: log.errorMsg
                ? log.errorMsg
                : log.isSlow
                    ? `Response time exceeded threshold (${log.responseTime}ms)`
                    : `Service returned ${statusText}`,
            severity,
            status: "active",
            timestamp: log.timestamp,
            affectedUrls: urlHref ? [urlHref] : [],
            errorMessage: log.errorMsg || null,
            statusCode: log.statusCode || null,
            responseTime: log.responseTime || null,
            urlName,
            isLive: false,
        }
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

/**
 * Derive live incidents from current URL states — same logic as the Incidents tab.
 */
function deriveLiveIncidents(urls) {
    return urls
        .filter(u => u.status === "Down" || u.status === "Warning")
        .map(u => ({
            id: `live-${u.id}`,
            title: `${u.name} — ${u.status === "Down" ? "Unreachable" : "Slow / Warning"}`,
            description: u.errorMsg
                ? u.errorMsg
                : u.status === "Down"
                    ? "Current health check reports this endpoint as down."
                    : `Response time is ${u.responseTime}ms — above threshold.`,
            severity: u.status === "Down" ? "critical" : "warning",
            status: "active",
            timestamp: u.lastCheck || new Date().toISOString(),
            affectedUrls: u.url ? [u.url] : [],
            errorMessage: u.errorMsg || null,
            statusCode: u.statusCode || null,
            responseTime: u.responseTime || null,
            urlName: u.name,
            isLive: true,
        }))
}

function StatCard({ value, label, color = "" }) {
    return (
        <div className="rounded-lg border bg-card p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
    )
}

function LiveIncidentRow({ incident }) {
    const isCritical = incident.severity === "critical"
    return (
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${isCritical
                ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10"
                : "border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-900/10"
            }`}>
            <div className={`mt-0.5 size-2 rounded-full shrink-0 ${isCritical ? "bg-red-500" : "bg-yellow-500"} animate-pulse`} />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isCritical ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"}`}>
                    {incident.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{incident.description}</p>
            </div>
            {incident.responseTime && (
                <span className="text-xs font-mono text-muted-foreground shrink-0">{incident.responseTime}ms</span>
            )}
        </div>
    )
}

function IncidentsContent() {
    const [incidents, setIncidents] = useState([])
    const [liveIncidents, setLiveIncidents] = useState([])
    const [filteredIncidents, setFilteredIncidents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [severityFilter, setSeverityFilter] = useState("all")
    const [timeFilter, setTimeFilter] = useState("7d")
    const [truncatedCount, setTruncatedCount] = useState(0)

    const fetchIncidents = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const urlsRes = await apiClient.get('/urls')
            if (!urlsRes.ok) throw new Error(`Failed to load URLs: HTTP ${urlsRes.status}`)
            const rawUrls = extractArray(await urlsRes.json())
            const urls = rawUrls.map(normaliseURL)

            const urlMap = {}
            for (const u of rawUrls) {
                const key = u.URLid || u.id
                if (key) urlMap[key] = { name: u.name, url: u.url }
            }

            // Live state — same filter as the Incidents tab
            setLiveIncidents(deriveLiveIncidents(urls))

            if (urls.length === 0) {
                setIncidents([])
                setFilteredIncidents([])
                return
            }

            const CAP = 10
            const urlsToQuery = rawUrls.slice(0, CAP)
            setTruncatedCount(Math.max(0, rawUrls.length - CAP))

            const logResponses = await Promise.all(
                urlsToQuery.map(async (u) => {
                    const urlId = u.URLid || u.id
                    if (!urlId) return []
                    try {
                        const res = await apiClient.get(`/logs?urlId=${encodeURIComponent(urlId)}`)
                        if (!res.ok) return []
                        return extractArray(await res.json()).map(l => ({ ...normaliseLog(l), urlId }))
                    } catch { return [] }
                })
            )

            const rawLogs = logResponses.flat()
            if (rawLogs.length === 0) {
                setIncidents([])
                setFilteredIncidents([])
                return
            }

            const derived = deriveIncidents(rawLogs, urlMap)
            setIncidents(derived)
            setFilteredIncidents(derived)
        } catch (err) {
            console.error('[Incidents] Error:', err)
            setError(err.message)
            setIncidents([])
            setFilteredIncidents([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchIncidents() }, [fetchIncidents])

    useEffect(() => {
        let filtered = incidents
        if (severityFilter !== "all") filtered = filtered.filter(i => i.severity === severityFilter)
        if (timeFilter !== "all") {
            const days = timeFilter === "24h" ? 1 : timeFilter === "7d" ? 7 : 30
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - days)
            filtered = filtered.filter(i => new Date(i.timestamp) >= cutoff)
        }
        setFilteredIncidents(filtered)
    }, [severityFilter, timeFilter, incidents])

    const allForStats = [...liveIncidents, ...incidents]
    const criticalCount = allForStats.filter(i => i.severity === "critical").length
    const warningCount = allForStats.filter(i => i.severity === "warning").length
    const mkCutoff = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d }
    const last24h = incidents.filter(i => new Date(i.timestamp) >= mkCutoff(1)).length
    const last7d = incidents.filter(i => new Date(i.timestamp) >= mkCutoff(7)).length

    return (
        <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" }}>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                            {/* Header */}
                            <div className="px-4 lg:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center size-10 rounded-lg bg-red-100 dark:bg-red-900/20">
                                            <IconAlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold tracking-tight">Alerts &amp; Incidents</h1>
                                            <p className="text-muted-foreground text-sm">Live status + failed checks from health monitoring logs</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={fetchIncidents} disabled={loading}>
                                        {loading ? "Loading..." : "Refresh"}
                                    </Button>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="px-4 lg:px-6">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <StatCard value={loading ? "..." : criticalCount} label="Critical Failures" color="text-red-600" />
                                    <StatCard value={loading ? "..." : warningCount} label="Warnings" color="text-yellow-600" />
                                    <StatCard value={loading ? "..." : last24h} label="Last 24 hours" />
                                    <StatCard value={loading ? "..." : last7d} label="Last 7 days" />
                                </div>
                            </div>

                            {/* Live incidents — synced with Incidents tab */}
                            {!loading && liveIncidents.length > 0 && (
                                <div className="px-4 lg:px-6 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">Currently Down / Warning</span>
                                        <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-red-500 text-white text-xs font-bold px-1">
                                            {liveIncidents.length}
                                        </span>
                                        <span className="text-xs text-muted-foreground">— matches the Incidents tab</span>
                                    </div>
                                    {liveIncidents.map(inc => <LiveIncidentRow key={inc.id} incident={inc} />)}
                                </div>
                            )}

                            {/* Filters */}
                            <div className="px-4 lg:px-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <span className="text-sm font-semibold text-muted-foreground">Historical Log Incidents</span>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="severity-filter" className="text-sm whitespace-nowrap">Severity:</Label>
                                            <Select value={severityFilter} onValueChange={setSeverityFilter}>
                                                <SelectTrigger id="severity-filter" className="w-32"><SelectValue placeholder="All" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="critical">Critical</SelectItem>
                                                    <SelectItem value="warning">Warning</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="time-filter" className="text-sm whitespace-nowrap">Period:</Label>
                                            <Select value={timeFilter} onValueChange={setTimeFilter}>
                                                <SelectTrigger id="time-filter" className="w-36"><SelectValue placeholder="Last 7 days" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="24h">Last 24 hours</SelectItem>
                                                    <SelectItem value="7d">Last 7 days</SelectItem>
                                                    <SelectItem value="30d">Last 30 days</SelectItem>
                                                    <SelectItem value="all">All time</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Showing <span className="font-medium">{filteredIncidents.length}</span> of{" "}
                                        <span className="font-medium">{incidents.length}</span> log incidents
                                    </div>
                                    {truncatedCount > 0 && (
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded px-2 py-1">
                                            ⚠ Showing logs for first 10 of {truncatedCount + 10} URLs. {truncatedCount} URL{truncatedCount !== 1 ? 's' : ''} not shown.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="px-4 lg:px-6">
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                        <p className="text-muted-foreground mt-4">Loading incidents...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-12">
                                        <p className="text-destructive mb-4 font-medium">Error: {error}</p>
                                        <Button onClick={fetchIncidents} variant="outline">Retry</Button>
                                    </div>
                                ) : (
                                    <IncidentTimeline incidents={filteredIncidents} />
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default function Page() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                <IncidentsContent />
            </Suspense>
        </ProtectedRoute>
    )
}
