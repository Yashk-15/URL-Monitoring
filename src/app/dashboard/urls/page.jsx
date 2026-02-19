"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { URLListTable } from "./components/url-list-table"
import { IconListDetails } from "@tabler/icons-react"
import { apiClient, extractArray, normaliseURL } from "@/lib/api-client"
import { AddURLDialog } from "./components/add-url-dialog"
import { Button } from "@/components/ui/button"

function StatCard({ value, label, color = "" }) {
    return (
        <div className="rounded-lg border bg-card p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
    )
}

function MonitoredURLsContent() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchURLs = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await apiClient.get('/urls')

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`)
            }

            const result = await response.json()
            const rawData = extractArray(result)
            const transformedData = rawData.map(normaliseURL)
            setData(transformedData)
        } catch (err) {
            console.error("Error fetching URLs:", err)
            setError(err.message)
            setData([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchURLs()
    }, [fetchURLs])

    const totalURLs = data.length
    const activeCount = data.filter((u) => u.status === "Up").length
    const downCount = data.filter((u) => u.status === "Down").length
    const avgUptime = totalURLs > 0
        ? Math.round(
            data.reduce((sum, u) => sum + parseFloat(u.uptime || 0), 0) / totalURLs
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
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                                            <IconListDetails className="size-5 text-primary" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold tracking-tight">
                                                Monitored URLs
                                            </h1>
                                            <p className="text-muted-foreground text-sm">
                                                All URLs being monitored, with live status and performance metrics
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={fetchURLs}
                                            disabled={loading}
                                        >
                                            {loading ? "Loading..." : "Refresh"}
                                        </Button>
                                        <AddURLDialog onURLAdded={fetchURLs} />
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="px-4 lg:px-6">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <StatCard value={loading ? "..." : totalURLs} label="Total URLs" />
                                    <StatCard value={loading ? "..." : activeCount} label="Active" color="text-green-600" />
                                    <StatCard value={loading ? "..." : downCount} label="Down" color={downCount > 0 ? "text-red-600" : ""} />
                                    <StatCard value={loading ? "..." : `${avgUptime}%`} label="Avg Uptime" />
                                </div>
                            </div>

                            {/* Table */}
                            <div className="px-4 lg:px-6">
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                        <p className="text-muted-foreground mt-4">Loading monitored URLs...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-12">
                                        <p className="text-destructive mb-4 font-medium">Error: {error}</p>
                                        <Button onClick={fetchURLs} variant="outline">Retry</Button>
                                    </div>
                                ) : (
                                    <URLListTable data={data} onRefresh={fetchURLs} />
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
                <div className="flex items-center justify-center min-h-screen">Loading...</div>
            }>
                <MonitoredURLsContent />
            </Suspense>
        </ProtectedRoute>
    )
}
