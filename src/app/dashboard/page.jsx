"use client"

<<<<<<< HEAD
import { Suspense, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
=======
import { Suspense, useEffect, useState } from "react"
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { ChartAreaInteractive } from "@/app/dashboard/components/charts/area-chart"
import { DataTable } from "@/app/dashboard/components/url-table"
import { SectionCards } from "@/app/dashboard/components/stats-cards"
import { SiteHeader } from "@/components/layout/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
<<<<<<< HEAD
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { IconRefresh } from "@tabler/icons-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { apiClient, extractArray, normaliseURL } from "@/lib/api-client"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { toast } from "sonner"

// Tab value ↔ query-param mapping
const VIEW_TO_TAB = {
    all: "all",
    active: "active",
    incidents: "down",
    analytics: "analytics",
    settings: "settings",
    reports: "reports",
}
const TAB_TO_VIEW = Object.fromEntries(
    Object.entries(VIEW_TO_TAB).map(([v, t]) => [t, v])
)

function DashboardContent() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Derive active tab from URL — keeps URL and UI in sync bidirectionally
    const viewParam = searchParams.get("view") || "all"
    const activeTab = VIEW_TO_TAB[viewParam] || "all"

    const handleTabChange = (tab) => {
        const view = TAB_TO_VIEW[tab] || "all"
        const params = new URLSearchParams(searchParams.toString())
        if (view === "all") {
            params.delete("view")
        } else {
            params.set("view", view)
        }
        const qs = params.toString()
        router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    }

    const fetchURLs = useCallback(async (isManual = false) => {
        try {
            if (isManual) setIsRefreshing(true)
            else setLoading(true)
=======

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { IconRefresh } from "@tabler/icons-react"

import { useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { apiClient } from "@/lib/api-client"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"

function DashboardContent() {
    const searchParams = useSearchParams()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState("all")
    const [lastUpdated, setLastUpdated] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Sync tab with URL query param
    useEffect(() => {
        const view = searchParams.get("view")
        if (view === "incidents") {
            setActiveTab("down")
        } else if (view === "active") {
            setActiveTab("active")
        } else if (view === "analytics") {
            setActiveTab("analytics")
        } else if (view === "settings") {
            setActiveTab("settings")
        } else if (view === "reports") {
            setActiveTab("reports")
        } else {
            setActiveTab("all")
        }
    }, [searchParams])

    const fetchURLs = async () => {
        try {
            setLoading(true)
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
            setError(null)

            const response = await apiClient.get('/urls')

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`)
            }

            const result = await response.json()
<<<<<<< HEAD
            const rawData = extractArray(result)
            const transformedData = rawData.map(normaliseURL)

            setData(transformedData)
            setLastUpdated(new Date())

            if (isManual) {
                toast.success(`Refreshed ${transformedData.length} monitors`)
            }
        } catch (err) {
            console.error("Error fetching URLs:", err)
            setError(err.message)
            setData([])
            if (isManual) {
                toast.error("Failed to refresh data")
            }
=======

            // Extract URLs array from response
            let rawData = []
            if (Array.isArray(result)) {
                rawData = result
            } else if (result && typeof result === 'object') {
                rawData = result.data || result.urls || []
            }

            // Map API response to component expectations
            // Backend now returns REAL health data from DynamoDB!
            const transformedData = rawData.map((url) => ({
                // Use 'id' field (backend now provides this)
                id: url.id || url.URLid,
                name: url.name || "Unnamed URL",
                url: url.url || "",
                // REAL monitoring data from backend
                status: url.status || "Unknown",
                responseTime: url.responseTime?.toString() || "0",
                uptime: url.uptime || "0",
                lastCheck: url.lastCheck || "Never",
                region: url.region || "Unknown",
                // Keep original fields for reference
                enabled: url.enabled,
                expectedStatus: url.expectedStatus,
                maxLatencyMs: url.maxLatencyMs,
                timeoutSeconds: url.timeoutSeconds,
                // Additional health info from backend
                statusCode: url.statusCode,
                errorMsg: url.errorMsg,
                isUp: url.isUp,
                isSlow: url.isSlow,
            }))

            setData(transformedData)
            setLastUpdated(new Date())
        } catch (err) {
            console.error("Error fetching URLs:", err)
            setError(err.message)
            setData([]) // Set empty array on error
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
<<<<<<< HEAD
    }, [])

    const handleManualRefresh = () => fetchURLs(true)

    // Initial fetch
    useEffect(() => {
        fetchURLs()
    }, [fetchURLs])
=======
    }

    const handleManualRefresh = async () => {
        setIsRefreshing(true)
        await fetchURLs()
    }

    // Initial fetch on mount
    useEffect(() => {
        fetchURLs()
    }, [])
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886

    // Auto-refresh every 30 seconds
    useAutoRefresh(fetchURLs, 30000, true)

<<<<<<< HEAD
    const filteredData = data.filter((item) => {
=======
    const filteredData = data.filter(item => {
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
        if (activeTab === "all") return true
        if (activeTab === "active") return item.status === "Up"
        if (activeTab === "down") return item.status === "Down" || item.status === "Warning"
        return true
    })

<<<<<<< HEAD
    const renderTable = (tableData) => {
        if (loading) {
            return (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <p className="text-muted-foreground mt-4">Loading monitors...</p>
                </div>
            )
        }
        if (error) {
            return (
                <div className="text-center py-12">
                    <p className="text-destructive mb-4 font-medium">Error: {error}</p>
                    <Button onClick={handleManualRefresh} variant="outline">
                        Retry
                    </Button>
                </div>
            )
        }
        return <DataTable data={tableData} onRefresh={fetchURLs} />
    }

=======
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
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
<<<<<<< HEAD

                            {/* Stats cards always reflect full dataset */}
                            <SectionCards data={data} loading={loading} />

                            <Tabs
                                value={activeTab}
                                onValueChange={handleTabChange}
                                className="w-full px-4 lg:px-6"
                            >
=======
                            <SectionCards data={data} loading={loading} />

                            <Tabs value={activeTab} className="w-full px-4 lg:px-6" onValueChange={setActiveTab}>
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
                                <div className="flex items-center justify-between mb-4">
                                    <TabsList>
                                        <TabsTrigger value="all">All Monitors</TabsTrigger>
                                        <TabsTrigger value="active">Active</TabsTrigger>
<<<<<<< HEAD
                                        <TabsTrigger
                                            value="down"
                                            className="data-[state=active]:text-red-600"
                                        >
                                            Incidents
                                            {data.filter(d => d.status === "Down" || d.status === "Warning").length > 0 && (
                                                <span className="ml-1.5 inline-flex items-center justify-center size-5 rounded-full bg-red-500 text-white text-xs font-bold">
                                                    {data.filter(d => d.status === "Down" || d.status === "Warning").length}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="flex items-center gap-3">
                                        {lastUpdated && (
                                            <span className="text-sm text-muted-foreground hidden sm:block">
                                                Updated: {lastUpdated.toLocaleTimeString()}
=======
                                        <TabsTrigger value="down" className="text-red-500 data-[state=active]:text-red-600">
                                            Incidents
                                        </TabsTrigger>
                                    </TabsList>
                                    <div className="flex items-center gap-3">
                                        {lastUpdated && (
                                            <span className="text-sm text-muted-foreground">
                                                Last updated: {lastUpdated.toLocaleTimeString()}
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
                                            </span>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleManualRefresh}
<<<<<<< HEAD
                                            disabled={isRefreshing || loading}
=======
                                            disabled={isRefreshing}
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
                                        >
                                            <IconRefresh className={isRefreshing ? "animate-spin" : ""} />
                                            {isRefreshing ? "Refreshing..." : "Refresh"}
                                        </Button>
                                    </div>
                                </div>

                                <TabsContent value="all" className="space-y-4">
<<<<<<< HEAD
                                    <ChartAreaInteractive data={data} />
                                    {renderTable(data)}
                                </TabsContent>

                                <TabsContent value="active" className="space-y-4">
                                    <ChartAreaInteractive data={filteredData} />
                                    {renderTable(filteredData)}
                                </TabsContent>

                                <TabsContent value="down" className="space-y-4">
                                    <ChartAreaInteractive data={filteredData} />
                                    {renderTable(filteredData)}
                                </TabsContent>

                                <TabsContent value="analytics" className="space-y-4">
                                    <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                                        <p className="text-lg font-medium mb-2">Analytics Coming Soon</p>
                                        <p className="text-sm">Historical trend analysis and detailed performance reports will appear here.</p>
=======
                                    <div className="">
                                        <ChartAreaInteractive data={data} />
                                    </div>
                                    {loading ? (
                                        <div className="text-center py-8">
                                            <p className="text-muted-foreground">Loading monitored URLs...</p>
                                        </div>
                                    ) : error ? (
                                        <div className="text-center py-8">
                                            <p className="text-destructive">Error: {error}</p>
                                            <button
                                                onClick={fetchURLs}
                                                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <DataTable data={filteredData} />
                                    )}
                                </TabsContent>

                                <TabsContent value="active" className="space-y-4">
                                    {/* Reuse same structure for active tab, filteredData handles content */}
                                    <div className="">
                                        <ChartAreaInteractive data={filteredData} />
                                    </div>
                                    <DataTable data={filteredData} />
                                </TabsContent>

                                <TabsContent value="down" className="space-y-4">
                                    <div className="">
                                        <ChartAreaInteractive data={filteredData} />
                                    </div>
                                    <DataTable data={filteredData} />
                                </TabsContent>

                                <TabsContent value="analytics" className="space-y-4">
                                    <div className="px-4 lg:px-6">
                                        <h2 className="text-2xl font-bold mb-4">Analytics</h2>
                                        <div className="">
                                            <ChartAreaInteractive data={data} />
                                        </div>
                                        <p className="text-muted-foreground mt-4">
                                            Detailed analytics and performance metrics will be displayed here.
                                        </p>
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
                                    </div>
                                </TabsContent>

                                <TabsContent value="settings" className="space-y-4">
<<<<<<< HEAD
                                    <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                                        <p className="text-lg font-medium mb-2">Settings Coming Soon</p>
                                        <p className="text-sm">Notification preferences, alert thresholds, and account settings will appear here.</p>
=======
                                    <div className="px-4 lg:px-6">
                                        <h2 className="text-2xl font-bold mb-4">Settings</h2>
                                        <p className="text-muted-foreground">
                                            Configure your monitoring preferences, notification settings, and account details here.
                                        </p>
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
                                    </div>
                                </TabsContent>

                                <TabsContent value="reports" className="space-y-4">
<<<<<<< HEAD
                                    <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                                        <p className="text-lg font-medium mb-2">Reports Coming Soon</p>
                                        <p className="text-sm">Downloadable uptime reports and SLA summaries will appear here.</p>
=======
                                    <div className="px-4 lg:px-6">
                                        <h2 className="text-2xl font-bold mb-4">Uptime Reports</h2>
                                        <p className="text-muted-foreground">
                                            View and download historical uptime reports for your monitored URLs.
                                        </p>
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
                                    </div>
                                </TabsContent>
                            </Tabs>
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
<<<<<<< HEAD
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading dashboard...</p>
                    </div>
                </div>
            }>
=======
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>}>
>>>>>>> 811c5987ec24b3f80eb8bd11c9a41d6115802886
                <DashboardContent />
            </Suspense>
        </ProtectedRoute>
    )
}
