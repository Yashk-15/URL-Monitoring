"use client"

import { useState } from "react"
import {
    IconDotsVertical,
    IconLogout,
    IconUserCircle,
    IconMail,
    IconShieldCheck,
} from "@tabler/icons-react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

function ProfileDialog({ open, onOpenChange, user, initials }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Your Profile</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {}
                    <Avatar className="h-20 w-20 rounded-full ring-2 ring-primary/20">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="rounded-full text-xl font-bold bg-primary/10 text-primary">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    {}
                    <div className="text-center">
                        <p className="text-lg font-semibold">{user.name || "User"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                </div>

                {}
                <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center gap-3 text-sm">
                        <IconMail className="size-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <IconShieldCheck className="size-4 text-muted-foreground shrink-0" />
                        <span className="flex-1">Account verified</span>
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20">
                            Active
                        </Badge>
                    </div>
                </div>

                <div className="pt-2 text-xs text-muted-foreground text-center">
                    To update your name or password, use your Cognito account settings.
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function NavUser({ user }) {
    const { isMobile } = useSidebar()
    const { logout } = useAuth()
    const router = useRouter()
    const [profileOpen, setProfileOpen] = useState(false)

    const initials = user.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : (user.email?.[0] || 'U').toUpperCase()

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <Avatar className="h-8 w-8 rounded-lg grayscale">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback className="rounded-lg text-xs">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name || "User"}</span>
                                    <span className="text-muted-foreground truncate text-xs">
                                        {user.email}
                                    </span>
                                </div>
                                <IconDotsVertical className="ml-auto size-4" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                            side={isMobile ? "bottom" : "right"}
                            align="end"
                            sideOffset={4}
                        >
                            {}
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{user.name || "User"}</span>
                                        <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            {}
                            <DropdownMenuItem
                                onClick={() => setProfileOpen(true)}
                                className="cursor-pointer"
                            >
                                <IconUserCircle className="size-4" />
                                Profile
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={logout}
                                className="cursor-pointer text-destructive focus:text-destructive"
                            >
                                <IconLogout className="size-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>

            {}
            <ProfileDialog
                open={profileOpen}
                onOpenChange={setProfileOpen}
                user={user}
                initials={initials}
            />
        </>
    )
}
