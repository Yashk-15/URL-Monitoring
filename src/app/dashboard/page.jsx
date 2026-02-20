"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
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
            setError(null)

            const response = await apiClient.get('/urls')

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`)
            }

            const result = await response.json()
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
        } finally {
            // Only reset the flag that was set at the start
            if (isManual) setIsRefreshing(false)
            else setLoading(false)
        }
    }, [])

    const handleManualRefresh = () => fetchURLs(true)

    // Initial fetch
    useEffect(() => {
        fetchURLs()
    }, [fetchURLs])

    // Auto-refresh every 30 seconds
    useAutoRefresh(fetchURLs, 30000, true)

    const filteredData = data.filter((item) => {
        if (activeTab === "all") return true
        if (activeTab === "active") return item.status === "Up"
        if (activeTab === "down") return item.status === "Down" || item.status === "Warning"
        return true
    })

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

                            {/* Stats cards always reflect full dataset */}
                            <SectionCards data={data} loading={loading} />

                            <Tabs
                                value={activeTab}
                                onValueChange={handleTabChange}
                                className="w-full px-4 lg:px-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <TabsList>
                                        <TabsTrigger value="all">All Monitors</TabsTrigger>
                                        <TabsTrigger value="active">Active</TabsTrigger>
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
                                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                                        <TabsTrigger value="settings">Settings</TabsTrigger>
                                        <TabsTrigger value="reports">Reports</TabsTrigger>
                                    </TabsList>

                                    <div className="flex items-center gap-3">
                                        {lastUpdated && (
                                            <span className="text-sm text-muted-foreground hidden sm:block">
                                                Updated: {lastUpdated.toLocaleTimeString()}
                                            </span>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleManualRefresh}
                                            disabled={isRefreshing || loading}
                                        >
                                            <IconRefresh className={isRefreshing ? "animate-spin" : ""} />
                                            {isRefreshing ? "Refreshing..." : "Refresh"}
                                        </Button>
                                    </div>
                                </div>

                                <TabsContent value="all" className="space-y-4">
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
                                    </div>
                                </TabsContent>

                                <TabsContent value="settings" className="space-y-4">
                                    <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                                        <p className="text-lg font-medium mb-2">Settings Coming Soon</p>
                                        <p className="text-sm">Notification preferences, alert thresholds, and account settings will appear here.</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="reports" className="space-y-4">
                                    <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                                        <p className="text-lg font-medium mb-2">Reports Coming Soon</p>
                                        <p className="text-sm">Downloadable uptime reports and SLA summaries will appear here.</p>
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
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading dashboard...</p>
                    </div>
                </div>
            }>
                <DashboardContent />
            </Suspense>
        </ProtectedRoute>
    )
}