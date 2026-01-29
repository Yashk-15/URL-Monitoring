import { IconTrendingDown, IconTrendingUp, IconWorld, IconActivity, IconAlertTriangle, IconClock } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export function SectionCards({ data = [], loading = false }) {
    // Calculate metrics from data
    const totalURLs = data.length
    const activeMonitors = data.filter(url => url.status === "Up").length
    const failedChecks = data.filter(url => url.status === "Down").length
    const warningChecks = data.filter(url => url.status === "Warning").length

    // Calculate average response time
    const avgResponseTime = data.length > 0
        ? Math.round(data.reduce((sum, url) => sum + (parseInt(url.responseTime) || 0), 0) / data.length)
        : 0

    // Calculate unique regions
    const uniqueRegions = [...new Set(data.map(url => url.region))].length

    // Calculate percentage of active monitors
    const activePercentage = totalURLs > 0 ? ((activeMonitors / totalURLs) * 100).toFixed(1) : 0

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Total URLs Monitored</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {loading ? "..." : totalURLs}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            <IconWorld />
                            {uniqueRegions} {uniqueRegions === 1 ? "region" : "regions"}
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {activeMonitors === totalURLs ? "All endpoints active" : `${activeMonitors} active`} <IconWorld className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                        Monitoring across {uniqueRegions} {uniqueRegions === 1 ? "region" : "regions"}
                    </div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Active Monitors</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {loading ? "..." : activeMonitors}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            <IconActivity />
                            {activePercentage}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {activePercentage >= 90 ? "Healthy status" : "Needs attention"} <IconTrendingUp className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                        {totalURLs - activeMonitors} {totalURLs - activeMonitors === 1 ? "monitor" : "monitors"} {totalURLs - activeMonitors === 1 ? "is" : "are"} down/paused
                    </div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Failed Checks (24h)</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {loading ? "..." : failedChecks}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            <IconAlertTriangle />
                            {warningChecks} warnings
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {failedChecks === 0 ? "All systems operational" : `${failedChecks} ${failedChecks === 1 ? "failure" : "failures"}`} <IconTrendingDown className="size-4" />
                    </div>
                    <div className="text-muted-foreground">{failedChecks === 0 ? "No incidents" : "Check alerts for details"}</div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Avg Response Time</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {loading ? "..." : `${avgResponseTime}ms`}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            <IconClock />
                            {avgResponseTime < 300 ? "Fast" : avgResponseTime < 500 ? "Normal" : "Slow"}
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {avgResponseTime < 300 ? "Excellent performance" : "Performance varies"} <IconClock className="size-4" />
                    </div>
                    <div className="text-muted-foreground">{avgResponseTime < 300 ? "All endpoints fast" : "Some endpoints slow"}</div>
                </CardFooter>
            </Card>
        </div>
    )
}

