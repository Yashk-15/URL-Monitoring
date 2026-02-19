"use client"

import * as React from "react"
import { IconAlertTriangle, IconChevronDown, IconClock } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const severityConfig = {
    critical: {
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/30",
        border: "border-red-200 dark:border-red-800",
        badge: "destructive",
        icon: IconAlertTriangle,
    },
    warning: {
        color: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-50 dark:bg-yellow-950/30",
        border: "border-yellow-200 dark:border-yellow-800",
        badge: "secondary",
        icon: IconAlertTriangle,
    },
    info: {
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800",
        badge: "outline",
        icon: IconAlertTriangle,
    },
}

export function IncidentCard({ incident }) {
    const [isExpanded, setIsExpanded] = React.useState(false)
    const severity = incident.severity?.toLowerCase() || "info"
    const config = severityConfig[severity] || severityConfig.info
    const SeverityIcon = config.icon

    return (
        <Card className={cn("transition-all hover:shadow-md", config.border)}>
            <CardHeader className={cn("pb-3", config.bg)}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className={cn("mt-1 p-2 rounded-lg", config.bg)}>
                            <SeverityIcon className={cn("size-5", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-base font-semibold truncate">
                                    {incident.title || "Untitled Incident"}
                                </CardTitle>
                                <Badge variant={config.badge} className="capitalize shrink-0">
                                    {severity}
                                </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-2 text-sm">
                                <IconClock className="size-3" />
                                {incident.timestamp || "Unknown time"}
                            </CardDescription>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <IconChevronDown
                            className={cn(
                                "size-4 transition-transform",
                                isExpanded && "rotate-180"
                            )}
                        />
                    </Button>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="pt-4 space-y-4">
                    {/* Incident Details */}
                    <div className="space-y-2">
                        <div>
                            <div className="text-sm font-medium mb-1">Description</div>
                            <div className="text-sm text-muted-foreground">
                                {incident.description || "No description provided"}
                            </div>
                        </div>

                        {incident.affectedUrls && incident.affectedUrls.length > 0 && (
                            <div>
                                <div className="text-sm font-medium mb-1">Affected URLs</div>
                                <div className="space-y-1">
                                    {incident.affectedUrls.map((url, idx) => (
                                        <div
                                            key={idx}
                                            className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded"
                                        >
                                            {url}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {incident.errorMessage && (
                            <div>
                                <div className="text-sm font-medium mb-1">Error Message</div>
                                <div className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                    {incident.errorMessage}
                                </div>
                            </div>
                        )}

                        {incident.statusCode && (
                            <div>
                                <div className="text-sm font-medium mb-1">Status Code</div>
                                <div className="text-sm text-muted-foreground">
                                    {incident.statusCode}
                                </div>
                            </div>
                        )}

                        {incident.responseTime && (
                            <div>
                                <div className="text-sm font-medium mb-1">Response Time</div>
                                <div className="text-sm text-muted-foreground">
                                    {incident.responseTime}ms
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
