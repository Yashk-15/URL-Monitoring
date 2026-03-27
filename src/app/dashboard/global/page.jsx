"use client"

import { Suspense } from "react"
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { GlobalMonitorTab } from "@/app/dashboard/components/global-monitor-tab"

function GlobalContent() {
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
                        <div className="flex flex-col gap-4 py-4 px-4 md:gap-6 md:py-6 lg:px-6">
                            <GlobalMonitorTab />
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
                        <p className="text-muted-foreground">Loading Global Monitor...</p>
                    </div>
                </div>
            }>
                <GlobalContent />
            </Suspense>
        </ProtectedRoute>
    )
}
