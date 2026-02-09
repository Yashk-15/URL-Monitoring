"use client"

import { Suspense, useEffect, useState } from "react"
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { ChartAreaInteractive } from "@/app/dashboard/components/charts/area-chart"
import { DataTable } from "@/app/dashboard/components/url-table"
import { SectionCards } from "@/app/dashboard/components/stats-cards"
import { SiteHeader } from "@/components/layout/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

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
            setError(null)

            const response = await apiClient.get('/urls')

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`)
            }

            const result = await response.json()

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
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }

    const handleManualRefresh = async () => {
        setIsRefreshing(true)
        await fetchURLs()
    }

    // Initial fetch on mount
    useEffect(() => {
        fetchURLs()
    }, [])

    // Auto-refresh every 30 seconds
    useAutoRefresh(fetchURLs, 30000, true)

    const filteredData = data.filter(item => {
        if (activeTab === "all") return true
        if (activeTab === "active") return item.status === "Up"
        if (activeTab === "down") return item.status === "Down" || item.status === "Warning"
        return true
    })

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
                            <SectionCards data={data} loading={loading} />

                            <Tabs value={activeTab} className="w-full px-4 lg:px-6" onValueChange={setActiveTab}>
                                <div className="flex items-center justify-between mb-4">
                                    <TabsList>
                                        <TabsTrigger value="all">All Monitors</TabsTrigger>
                                        <TabsTrigger value="active">Active</TabsTrigger>
                                        <TabsTrigger value="down" className="text-red-500 data-[state=active]:text-red-600">
                                            Incidents
                                        </TabsTrigger>
                                    </TabsList>
                                    <div className="flex items-center gap-3">
                                        {lastUpdated && (
                                            <span className="text-sm text-muted-foreground">
                                                Last updated: {lastUpdated.toLocaleTimeString()}
                                            </span>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleManualRefresh}
                                            disabled={isRefreshing}
                                        >
                                            <IconRefresh className={isRefreshing ? "animate-spin" : ""} />
                                            {isRefreshing ? "Refreshing..." : "Refresh"}
                                        </Button>
                                    </div>
                                </div>

                                <TabsContent value="all" className="space-y-4">
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
                                    </div>
                                </TabsContent>

                                <TabsContent value="settings" className="space-y-4">
                                    <div className="px-4 lg:px-6">
                                        <h2 className="text-2xl font-bold mb-4">Settings</h2>
                                        <p className="text-muted-foreground">
                                            Configure your monitoring preferences, notification settings, and account details here.
                                        </p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="reports" className="space-y-4">
                                    <div className="px-4 lg:px-6">
                                        <h2 className="text-2xl font-bold mb-4">Uptime Reports</h2>
                                        <p className="text-muted-foreground">
                                            View and download historical uptime reports for your monitored URLs.
                                        </p>
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
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>}>
                <DashboardContent />
            </Suspense>
        </ProtectedRoute>
    )
}
