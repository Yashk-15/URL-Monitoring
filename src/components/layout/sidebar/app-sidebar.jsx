"use client"

import * as React from "react"
import {
    IconChartBar,
    IconDashboard,
    IconInnerShadowTop,
    IconListDetails,
    IconAlertTriangle,
    IconSettings,
} from "@tabler/icons-react"

import { NavMain } from "@/components/layout/sidebar/nav-main"
import { NavSecondary } from "@/components/layout/sidebar/nav-secondary"
import { NavUser } from "@/components/layout/sidebar/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"

const navItems = [
    {
        title: "Overview",
        url: "/dashboard",
        icon: IconDashboard,
    },
    {
        title: "Monitored URLs",
        url: "/dashboard/urls",
        icon: IconListDetails,
    },
    {
        title: "Alerts & Incidents",
        url: "/dashboard/incidents",
        icon: IconAlertTriangle,
    },
    {
        title: "Analytics",
        url: "/dashboard?view=analytics",
        icon: IconChartBar,
    },
    {
        title: "Settings",
        url: "/dashboard?view=settings",
        icon: IconSettings,
    },
]

export function AppSidebar({ ...props }) {
    const { user } = useAuth()

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="/dashboard">
                                <IconInnerShadowTop className="!size-5" />
                                <span className="text-base font-semibold">URL Monitor</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} />
                {/* NavDocuments removed — no document-type data in this app */}
                <NavSecondary items={[]} className="mt-auto" />
            </SidebarContent>

            <SidebarFooter>
                {user && <NavUser user={user} />}
            </SidebarFooter>
        </Sidebar>
    )
}