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
 * Build incident records from:
 *   1. /logs  → URL_Health_details (URLid PK + Timestamp SK) — historical failures
 *   2. /urls  → URL_Monitoring + URL_State — current state for names/URLs
 *
 * An "incident" = any log entry where isUp===false or status==="Down".
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

        let severity = "warning"
        if (!log.isUp) severity = "critical"
        else if (log.isSlow) severity = "warning"
        else if (log.statusCode >= 400) severity = "warning"

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
            status: "active",    // Historical logs are all treated as past active incidents
            timestamp: log.timestamp,
            affectedUrls: urlHref ? [urlHref] : [],
            errorMessage: log.errorMsg || null,
            statusCode: log.statusCode || null,
            responseTime: log.responseTime || null,
            urlName,
        }
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))  // newest first
}

function StatCard({ value, label, color = "" }) {
    return (
        <div className="rounded-lg border bg-card p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
    )
}

function IncidentsContent() {
    const [incidents, setIncidents] = useState([])
    const [filteredIncidents, setFilteredIncidents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [severityFilter, setSeverityFilter] = useState("all")
    const [timeFilter, setTimeFilter] = useState("7d")

    const fetchIncidents = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            // Step 1: get all URLs for this user
            const urlsRes = await apiClient.get('/urls')
            if (!urlsRes.ok) {
                throw new Error(`Failed to load URLs: HTTP ${urlsRes.status}`)
            }
            const urlsResult = await urlsRes.json()
            const urls = extractArray(urlsResult)

            // Build a name/href map keyed by URLid
            const urlMap = {}
            for (const u of urls) {
                const key = u.URLid || u.id
                if (key) urlMap[key] = { name: u.name, url: u.url }
            }

            if (urls.length === 0) {
                setIncidents([])
                setFilteredIncidents([])
                return
            }

            // Step 2: fetch logs per URL in parallel (Lambda requires ?urlId=X)
            const urlsToQuery = urls.slice(0, 10) // cap to avoid hammering Lambda
            const logResponses = await Promise.all(
                urlsToQuery.map(async (u) => {
                    const urlId = u.URLid || u.id
                    if (!urlId) return []
                    try {
                        const res = await apiClient.get(`/logs?urlId=${encodeURIComponent(urlId)}`)
                        if (!res.ok) {
                            console.warn(`[Incidents] /logs?urlId=${urlId} → ${res.status}`)
                            return []
                        }
                        const raw = await res.json()
                        return extractArray(raw).map(normaliseLog)
                    } catch (err) {
                        console.error(`[Incidents] error fetching logs for ${urlId}:`, err)
                        return []
                    }
                })
            )

            const rawLogs = logResponses.flat()
            console.log('[Incidents] total log entries:', rawLogs.length)

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

    useEffect(() => {
        fetchIncidents()
    }, [fetchIncidents])

    // Apply filters
    useEffect(() => {
        let filtered = incidents

        if (severityFilter !== "all") {
            filtered = filtered.filter((i) => i.severity === severityFilter)
        }

        if (timeFilter !== "all") {
            const days = timeFilter === "24h" ? 1 : timeFilter === "7d" ? 7 : 30
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - days)
            filtered = filtered.filter((i) => new Date(i.timestamp) >= cutoff)
        }

        setFilteredIncidents(filtered)
    }, [severityFilter, timeFilter, incidents])

    // Stats
    const criticalCount = incidents.filter((i) => i.severity === "critical").length
    const warningCount = incidents.filter((i) => i.severity === "warning").length
    const last24h = incidents.filter((i) => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 1)
        return new Date(i.timestamp) >= cutoff
    }).length
    const last7d = incidents.filter((i) => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 7)
        return new Date(i.timestamp) >= cutoff
    }).length

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
            }}
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                            {/* Page Header */}
                            <div className="px-4 lg:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center size-10 rounded-lg bg-red-100 dark:bg-red-900/20">
                                            <IconAlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold tracking-tight">
                                                Alerts & Incidents
                                            </h1>
                                            <p className="text-muted-foreground text-sm">
                                                Failed checks from URL health monitoring logs
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchIncidents}
                                        disabled={loading}
                                    >
                                        {loading ? "Loading..." : "Refresh"}
                                    </Button>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="px-4 lg:px-6">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <StatCard
                                        value={loading ? "..." : criticalCount}
                                        label="Critical Failures"
                                        color="text-red-600"
                                    />
                                    <StatCard
                                        value={loading ? "..." : warningCount}
                                        label="Warnings"
                                        color="text-yellow-600"
                                    />
                                    <StatCard
                                        value={loading ? "..." : last24h}
                                        label="Last 24 hours"
                                    />
                                    <StatCard
                                        value={loading ? "..." : last7d}
                                        label="Last 7 days"
                                    />
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="px-4 lg:px-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="severity-filter" className="text-sm whitespace-nowrap">
                                                Severity:
                                            </Label>
                                            <Select value={severityFilter} onValueChange={setSeverityFilter}>
                                                <SelectTrigger id="severity-filter" className="w-32">
                                                    <SelectValue placeholder="All" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="critical">Critical</SelectItem>
                                                    <SelectItem value="warning">Warning</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="time-filter" className="text-sm whitespace-nowrap">
                                                Period:
                                            </Label>
                                            <Select value={timeFilter} onValueChange={setTimeFilter}>
                                                <SelectTrigger id="time-filter" className="w-36">
                                                    <SelectValue placeholder="Last 7 days" />
                                                </SelectTrigger>
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
                                        <span className="font-medium">{incidents.length}</span> incidents
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="px-4 lg:px-6">
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                        <p className="text-muted-foreground mt-4">Loading incidents from logs...</p>
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
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                    Loading...
                </div>
            }>
                <IncidentsContent />
            </Suspense>
        </ProtectedRoute>
    )
}
