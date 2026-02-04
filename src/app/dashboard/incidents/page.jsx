"use client"

import { Suspense, useEffect, useState } from "react"
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { IncidentTimeline } from "./components/incident-timeline"
import { IconAlertTriangle, IconCheck, IconClock, IconTrendingUp } from "@tabler/icons-react"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

function IncidentsContent() {
    const [incidents, setIncidents] = useState([])
    const [filteredIncidents, setFilteredIncidents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [severityFilter, setSeverityFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")

    useEffect(() => {
        fetchIncidents()
    }, [])

    const fetchIncidents = async () => {
        try {
            setLoading(true)
            setError(null)

            const apiBase = process.env.NEXT_PUBLIC_API_BASE

            // Try to fetch from incidents endpoint
            let response
            try {
                response = await fetch(`${apiBase}/incidents`)
            } catch (fetchError) {
                console.warn("Incidents endpoint not available:", fetchError.message)
                response = { ok: false, status: 404 }
            }

            if (!response.ok) {
                // If incidents endpoint doesn't exist, try to derive from URL logs
                console.warn("Incidents endpoint not available, attempting to fetch from logs")

                let logsResponse
                try {
                    logsResponse = await apiClient.get('/logs')
                } catch (logsError) {
                    console.warn("Logs endpoint not available:", logsError.message)
                    // Try /urls endpoint as final fallback
                    try {
                        logsResponse = await apiClient.get('/urls')
                    } catch (urlsError) {
                        console.warn("URLs endpoint not available:", urlsError.message)
                        // Show empty state instead of error
                        setIncidents([])
                        setFilteredIncidents([])
                        setLoading(false)
                        return
                    }
                }

                if (!logsResponse.ok) {
                    // Show empty state instead of throwing error
                    setIncidents([])
                    setFilteredIncidents([])
                    setLoading(false)
                    return
                }

                const logsResult = await logsResponse.json()

                // Transform logs into incidents
                const derivedIncidents = deriveIncidentsFromLogs(logsResult)
                setIncidents(derivedIncidents)
                setFilteredIncidents(derivedIncidents)
                setLoading(false)
                return
            }

            const result = await response.json()

            // Extract incidents array from response
            let rawData = []
            if (Array.isArray(result)) {
                rawData = result
            } else if (result && typeof result === 'object') {
                rawData = result.data || result.incidents || []
            }

            // Transform API response to match component expectations
            const transformedIncidents = rawData.map((incident) => ({
                id: incident.id || incident.incidentId,
                title: incident.title || incident.message || "Incident Detected",
                description: incident.description || incident.details || "An issue was detected with the monitored endpoint",
                severity: incident.severity?.toLowerCase() || (incident.status === "Down" ? "critical" : "warning"),
                status: incident.status?.toLowerCase() || "active",
                timestamp: incident.timestamp || incident.createdAt || new Date().toISOString(),
                affectedUrls: incident.affectedUrls || (incident.url ? [incident.url] : []),
                errorMessage: incident.errorMessage || incident.error,
                resolvedAt: incident.resolvedAt,
                resolvedBy: incident.resolvedBy,
            }))

            setIncidents(transformedIncidents)
            setFilteredIncidents(transformedIncidents)
        } catch (err) {
            console.error("Error fetching incidents:", err)
            // Show empty state instead of error for network issues
            setIncidents([])
            setFilteredIncidents([])
        } finally {
            setLoading(false)
        }
    }

    // Helper function to derive incidents from URL monitoring logs
    const deriveIncidentsFromLogs = (logsData) => {
        console.log("Raw logs data:", logsData) // Debug log

        let logs = []
        if (Array.isArray(logsData)) {
            logs = logsData
        } else if (logsData && typeof logsData === 'object') {
            logs = logsData.data || logsData.logs || logsData.urls || []
        }

        console.log("Processed logs:", logs) // Debug log

        // Filter for failed checks and convert to incidents
        const incidents = logs
            .filter(log => {
                // Check multiple conditions for failure
                const isDown = log.status === "Down" || log.status === "down" || log.status === "DOWN"
                const isError = log.status === "Error" || log.status === "error"
                const hasErrorCode = log.statusCode && log.statusCode >= 400
                const hasError = log.errorMsg || log.error || log.errorMessage

                return isDown || isError || hasErrorCode || hasError
            })
            .map((log, index) => {
                // Determine severity based on status code or status
                let severity = "warning"
                if (log.statusCode >= 500 || log.status === "Down") {
                    severity = "critical"
                } else if (log.statusCode >= 400) {
                    severity = "warning"
                }

                // Create a descriptive title
                const urlName = log.name || log.urlName || log.url || "Unknown URL"
                const statusText = log.status || `HTTP ${log.statusCode}` || "Error"

                return {
                    id: log.id || log.URLid || `incident-${index}`,
                    title: `${urlName} - ${statusText}`,
                    description: log.errorMsg || log.error || log.errorMessage || `Monitoring detected an issue with ${log.url || "the endpoint"}. Service became unavailable.`,
                    severity: severity,
                    status: "active", // All log-based incidents are active
                    timestamp: log.lastCheck || log.timestamp || log.checkedAt || new Date().toISOString(),
                    affectedUrls: [log.url].filter(Boolean),
                    errorMessage: log.errorMsg || log.error || log.errorMessage,
                    resolvedAt: null,
                    resolvedBy: null,
                }
            })

        console.log("Derived incidents:", incidents) // Debug log
        return incidents
    }

    useEffect(() => {
        let filtered = incidents

        if (severityFilter !== "all") {
            filtered = filtered.filter(i => i.severity === severityFilter)
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter(i => i.status === statusFilter)
        }

        setFilteredIncidents(filtered)
    }, [severityFilter, statusFilter, incidents])

    // Calculate statistics
    const activeIncidents = incidents.filter(i => i.status === "active").length
    const resolvedToday = incidents.filter(i => {
        if (i.status !== "resolved" || !i.resolvedAt) return false
        const resolvedDate = new Date(i.resolvedAt)
        const today = new Date()
        return resolvedDate.toDateString() === today.toDateString()
    }).length
    const totalThisWeek = incidents.filter(i => {
        const incidentDate = new Date(i.timestamp)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return incidentDate >= weekAgo
    }).length

    // Calculate MTTR (Mean Time To Resolve) in hours
    const resolvedIncidents = incidents.filter(i => i.status === "resolved" && i.resolvedAt)
    const mttr = resolvedIncidents.length > 0
        ? Math.round(
            resolvedIncidents.reduce((sum, incident) => {
                const start = new Date(incident.timestamp)
                const end = new Date(incident.resolvedAt)
                const hours = (end - start) / (1000 * 60 * 60)
                return sum + hours
            }, 0) / resolvedIncidents.length
        )
        : 0

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
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center justify-center size-10 rounded-lg bg-red-100 dark:bg-red-900/20">
                                        <IconAlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold tracking-tight">
                                            Alerts & Incidents
                                        </h1>
                                        <p className="text-muted-foreground text-sm">
                                            Monitor and manage all system alerts and incidents
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Summary */}
                            <div className="px-4 lg:px-6">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-2xl font-bold text-red-600">
                                            {loading ? "..." : activeIncidents}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Active Incidents</div>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-2xl font-bold text-green-600">
                                            {loading ? "..." : resolvedToday}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Resolved Today</div>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-2xl font-bold">
                                            {loading ? "..." : `${mttr}h`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Avg MTTR</div>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-2xl font-bold">
                                            {loading ? "..." : totalThisWeek}
                                        </div>
                                        <div className="text-xs text-muted-foreground">This Week</div>
                                    </div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="px-4 lg:px-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="severity-filter" className="text-sm whitespace-nowrap">
                                                Severity:
                                            </Label>
                                            <Select
                                                value={severityFilter}
                                                onValueChange={setSeverityFilter}
                                            >
                                                <SelectTrigger id="severity-filter" className="w-32">
                                                    <SelectValue placeholder="All" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="critical">Critical</SelectItem>
                                                    <SelectItem value="warning">Warning</SelectItem>
                                                    <SelectItem value="info">Info</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="status-filter" className="text-sm whitespace-nowrap">
                                                Status:
                                            </Label>
                                            <Select
                                                value={statusFilter}
                                                onValueChange={setStatusFilter}
                                            >
                                                <SelectTrigger id="status-filter" className="w-32">
                                                    <SelectValue placeholder="All" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                                                    <SelectItem value="resolved">Resolved</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        Showing {filteredIncidents.length} of {incidents.length} incidents
                                    </div>
                                </div>
                            </div>

                            {/* Incidents Timeline */}
                            <div className="px-4 lg:px-6">
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        <p className="text-muted-foreground mt-4">Loading incidents...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-12">
                                        <p className="text-destructive mb-4">Error: {error}</p>
                                        <button
                                            onClick={fetchIncidents}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                        >
                                            Retry
                                        </button>
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
