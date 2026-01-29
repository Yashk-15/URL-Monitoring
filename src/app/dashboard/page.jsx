"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page() {
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
                            <div className="px-4 lg:px-6">
                                <ChartAreaInteractive />
                            </div>
                            {loading ? (
                                <div className="px-4 lg:px-6 text-center py-8">
                                    <p className="text-muted-foreground">Loading monitored URLs...</p>
                                </div>
                            ) : error ? (
                                <div className="px-4 lg:px-6 text-center py-8">
                                    <p className="text-destructive">Error: {error}</p>
                                    <button
                                        onClick={fetchURLs}
                                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                <DataTable data={data} />
                            )}
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
