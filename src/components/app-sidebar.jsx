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

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
    user: {
        name: "Admin User",
        email: "admin@urlmonitor.com",
        avatar: "/avatars/user.jpg",
    },
    navMain: [
        {
            title: "Overview",
            url: "/dashboard?view=all",
            icon: IconDashboard,
        },
        {
            title: "Monitored URLs",
            url: "/dashboard?view=all",
            icon: IconListDetails,
        },
        {
            title: "Alerts & Incidents",
            url: "/dashboard?view=incidents",
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
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
