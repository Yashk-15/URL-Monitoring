"use client"

import { Suspense, useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useSearchParams } from "next/navigation"

function DashboardContent() {
    const searchParams = useSearchParams()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState("all")

    useEffect(() => {
        fetchURLs()
    }, [])

    // Sync tab with URL query param
    useEffect(() => {
        const view = searchParams.get("view")
        if (view === "incidents") {
            setActiveTab("down")
        } else if (view === "active") {
            setActiveTab("active")
        } else {
            setActiveTab("all")
        }
    }, [searchParams])

    const fetchURLs = async () => {
        try {
            setLoading(true)
            setError(null)

            const apiBase = process.env.NEXT_PUBLIC_API_BASE
            const response = await fetch(`${apiBase}/urls`)

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`)
            }

            const result = await response.json()

            // Ensure data is always an array
            if (Array.isArray(result)) {
                setData(result)
            } else if (result && typeof result === 'object') {
                // If API returns an object with a data property
                setData(result.data || result.urls || [])
            } else {
                setData([])
            }
        } catch (err) {
            console.error("Error fetching URLs:", err)
            setError(err.message)
            setData([]) // Set empty array on error
        } finally {
            setLoading(false)
        }
    }

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
                                </div>

                                <TabsContent value="all" className="space-y-4">
                                    <div className="">
                                        <ChartAreaInteractive />
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
                                        <ChartAreaInteractive />
                                    </div>
                                    <DataTable data={filteredData} />
                                </TabsContent>

                                <TabsContent value="down" className="space-y-4">
                                    <div className="">
                                        <ChartAreaInteractive />
                                    </div>
                                    <DataTable data={filteredData} />
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
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    )
}
