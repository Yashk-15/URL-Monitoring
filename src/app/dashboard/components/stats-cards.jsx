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
    // Separate enabled vs paused monitors
    const enabledData = data.filter(url => url?.enabled !== false)
    const pausedCount = data.length - enabledData.length

    const totalURLs = data.length
    const activeMonitors = enabledData.filter(url => url?.status === "Up").length
    const failedChecks  = enabledData.filter(url => url?.status === "Down").length
    const warningChecks = enabledData.filter(url => url?.status === "Warning").length

    // Average uptime — only enabled monitors
    const avgUptimeNum = enabledData.length > 0
        ? enabledData.reduce((sum, url) => {
            const uptime = url?.uptime ? parseFloat(url.uptime) : 0
            return sum + uptime
        }, 0) / enabledData.length
        : 0
    const avgUptime = avgUptimeNum.toFixed(1)

    // Average response time — only enabled monitors
    const avgResponseTime = enabledData.length > 0
        ? Math.round(enabledData.reduce((sum, url) => {
            const responseTime = url?.responseTime ? parseInt(url.responseTime) : 0
            return sum + responseTime
        }, 0) / enabledData.length)
        : 0

    const activePercentage = enabledData.length > 0 ? ((activeMonitors / enabledData.length) * 100).toFixed(1) : 0

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Total URLs Monitored</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {loading ? "..." : totalURLs}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            <IconActivity />
                            {avgUptime}% avg uptime
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {activeMonitors === enabledData.length ? "All enabled endpoints active" : `${activeMonitors} active`} <IconWorld className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                        {pausedCount > 0 ? `${pausedCount} monitor${pausedCount !== 1 ? "s" : ""} paused` : avgUptimeNum >= 99 ? "Excellent uptime" : avgUptimeNum >= 95 ? "Good uptime" : "Needs attention"}
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
                        {failedChecks} {failedChecks === 1 ? "monitor" : "monitors"} down{pausedCount > 0 ? `, ${pausedCount} paused` : ""}
                    </div>
                </CardFooter>
            </Card>
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Currently Down</CardDescription>
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
                    <div className="text-muted-foreground">{failedChecks === 0 ? "No incidents detected" : "Check alerts for details"}</div>
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

