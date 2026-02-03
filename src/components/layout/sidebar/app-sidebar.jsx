"use client"

import * as React from "react"
import {
    IconCamera,
    IconChartBar,
    IconDashboard,
    IconDatabase,
    IconFileAi,
    IconFileDescription,
    IconFileWord,
    IconFolder,
    IconHelp,
    IconInnerShadowTop,
    IconListDetails,
    IconReport,
    IconSearch,
    IconSettings,
    IconUsers,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/layout/sidebar/nav-documents"
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

const data = {
    navMain: [
        {
            title: "Overview",
            url: "/dashboard?view=all",
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
            icon: IconCamera,
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
    ],
    navSecondary: [],
    documents: [
        {
            name: "Alert History",
            url: "/dashboard?view=incidents",
            icon: IconDatabase,
        },
        {
            name: "Uptime Reports",
            url: "/dashboard?view=reports",
            icon: IconReport,
        },
    ],
}

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
                <NavMain items={data.navMain} />
                <NavDocuments items={data.documents} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                {user && <NavUser user={user} />}
            </SidebarFooter>
        </Sidebar>
    )
}
