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

// Mock data generator for incidents
function generateMockIncidents() {
    const incidents = []
    const now = Date.now()
    const severities = ["critical", "warning", "info"]
    const statuses = ["active", "acknowledged", "resolved"]
    const titles = [
        "High Response Time Detected",
        "Service Unavailable",
        "SSL Certificate Expiring Soon",
        "Timeout Error",
        "DNS Resolution Failed",
        "Server Not Responding",
        "Rate Limit Exceeded",
        "Database Connection Lost",
    ]
    const urls = [
        "https://api.example.com/health",
        "https://www.example.com",
        "https://app.example.com/api",
        "https://cdn.example.com",
    ]

    // Generate incidents for different time periods
    const timeOffsets = [
        { hours: 2, count: 2 },      // Today
        { hours: 26, count: 3 },     // Yesterday
        { hours: 72, count: 4 },     // This week
        { hours: 200, count: 3 },    // Older
    ]

    let id = 1
    timeOffsets.forEach(({ hours, count }) => {
        for (let i = 0; i < count; i++) {
            const timestamp = new Date(now - (hours * 60 * 60 * 1000) - (i * 60 * 60 * 1000))
            const severity = severities[Math.floor(Math.random() * severities.length)]
            const status = statuses[Math.floor(Math.random() * statuses.length)]
            const affectedUrlCount = Math.floor(Math.random() * 2) + 1

            incidents.push({
                id: id++,
                title: titles[Math.floor(Math.random() * titles.length)],
                description: `Monitoring detected an issue with the endpoint. Response time exceeded threshold or service became unavailable.`,
                severity,
                status,
                timestamp: timestamp.toLocaleString(),
                affectedUrls: Array.from({ length: affectedUrlCount }, () =>
                    urls[Math.floor(Math.random() * urls.length)]
                ),
                errorMessage: status === "active" ? "Connection timeout after 30 seconds" : null,
                resolvedAt: status === "resolved" ? new Date(timestamp.getTime() + 3600000).toLocaleString() : null,
                resolvedBy: status === "resolved" ? "Auto-resolved" : null,
            })
        }
    })

    return incidents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

function IncidentsContent() {
    const [incidents, setIncidents] = useState([])
    const [filteredIncidents, setFilteredIncidents] = useState([])
    const [loading, setLoading] = useState(true)
    const [severityFilter, setSeverityFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")

    useEffect(() => {
        // In production, fetch from API
        // For now, use mock data
        setTimeout(() => {
            const mockData = generateMockIncidents()
            setIncidents(mockData)
            setFilteredIncidents(mockData)
            setLoading(false)
        }, 500)
    }, [])

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
