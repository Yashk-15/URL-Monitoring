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
            url: "/dashboard",
            icon: IconDashboard,
        },
        {
            title: "Monitored URLs",
            url: "/dashboard",
            icon: IconListDetails,
        },
        {
            title: "Alerts & Incidents",
            url: "/dashboard",
            icon: IconCamera,
        },
        {
            title: "Analytics",
            url: "/dashboard",
            icon: IconChartBar,
        },
        {
            title: "Settings",
            url: "/dashboard",
            icon: IconSettings,
        },
    ],
    navSecondary: [
        {
            title: "API Docs",
            url: "/dashboard",
            icon: IconFileDescription,
        },
        {
            title: "Get Help",
            url: "/dashboard",
            icon: IconHelp,
        },
        {
            title: "Search",
            url: "/dashboard",
            icon: IconSearch,
        },
    ],
    documents: [
        {
            name: "Alert History",
            url: "/dashboard",
            icon: IconDatabase,
        },
        {
            name: "Uptime Reports",
            url: "/dashboard",
            icon: IconReport,
        },
        {
            name: "API Documentation",
            url: "/dashboard",
            icon: IconFileAi,
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
