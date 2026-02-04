"use client"

import { Suspense, useEffect, useState } from "react"
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { URLListTable } from "./components/url-list-table"
import { IconListDetails } from "@tabler/icons-react"
import { apiClient } from "@/lib/api-client"

function MonitoredURLsContent() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchURLs()
    }, [])

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
            const transformedData = rawData.map((url) => ({
                id: url.id || url.URLid,
                name: url.name || "Unnamed URL",
                url: url.url || "",
                status: url.status || "Unknown",
                responseTime: url.responseTime?.toString() || "0",
                uptime: url.uptime || "0",
                lastCheck: url.lastCheck || "Never",
                region: url.region || "Unknown",
                enabled: url.enabled,
                expectedStatus: url.expectedStatus,
                maxLatencyMs: url.maxLatencyMs,
                timeoutSeconds: url.timeoutSeconds,
                statusCode: url.statusCode,
                errorMsg: url.errorMsg,
                isUp: url.isUp,
                isSlow: url.isSlow,
            }))

            setData(transformedData)
        } catch (err) {
            console.error("Error fetching URLs:", err)
            setError(err.message)
            setData([])
        } finally {
            setLoading(false)
        }
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
                            {/* Page Header */}
                            <div className="px-4 lg:px-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                                        <IconListDetails className="size-5 text-primary" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold tracking-tight">
                                            Monitored URLs
                                        </h1>
                                        <p className="text-muted-foreground text-sm">
                                            View all monitored URLs with their status, uptime, and performance metrics
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Summary */}
                            <div className="px-4 lg:px-6">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-2xl font-bold">
                                            {loading ? "..." : data.length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Total URLs</div>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-2xl font-bold text-green-600">
                                            {loading ? "..." : data.filter(u => u.status === "Up").length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Active</div>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-2xl font-bold text-red-600">
                                            {loading ? "..." : data.filter(u => u.status === "Down").length}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Down</div>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-2xl font-bold">
                                            {loading ? "..." : data.length > 0
                                                ? `${Math.round(data.reduce((sum, u) => sum + parseFloat(u.uptime || 0), 0) / data.length)}%`
                                                : "0%"
                                            }
                                        </div>
                                        <div className="text-xs text-muted-foreground">Avg Uptime</div>
                                    </div>
                                </div>
                            </div>

                            {/* URLs Table */}
                            <div className="px-4 lg:px-6">
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        <p className="text-muted-foreground mt-4">Loading monitored URLs...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-12">
                                        <p className="text-destructive mb-4">Error: {error}</p>
                                        <button
                                            onClick={fetchURLs}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : (
                                    <URLListTable data={data} />
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
                <MonitoredURLsContent />
            </Suspense>
        </ProtectedRoute>
    )
}
