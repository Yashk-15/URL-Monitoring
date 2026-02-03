"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
    responseTime: {
        label: "Response Time",
        color: "hsl(var(--primary))",
    },
}

export function URLPerformanceChart({ data = [], urlName = "URL" }) {
    // If no data, show placeholder
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No performance data available yet
            </div>
        )
    }

    // Calculate average response time for color coding
    const avgResponseTime = data.reduce((sum, d) => sum + d.responseTime, 0) / data.length
    const performanceColor = avgResponseTime < 300
        ? "hsl(142, 76%, 36%)" // green
        : avgResponseTime < 500
            ? "hsl(48, 96%, 53%)" // yellow
            : "hsl(0, 84%, 60%)" // red

    return (
        <div className="w-full">
            <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Response Time (Last 24h)</h4>
                <span className="text-xs text-muted-foreground">
                    Avg: {Math.round(avgResponseTime)}ms
                </span>
            </div>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <AreaChart
                    accessibilityLayer
                    data={data}
                    margin={{
                        left: 0,
                        right: 0,
                        top: 10,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                        dataKey="timestamp"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            })
                        }}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => `${value}ms`}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={
                            <ChartTooltipContent
                                indicator="line"
                                labelFormatter={(value) => {
                                    const date = new Date(value)
                                    return date.toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })
                                }}
                            />
                        }
                    />
                    <Area
                        dataKey="responseTime"
                        type="monotone"
                        fill={performanceColor}
                        fillOpacity={0.2}
                        stroke={performanceColor}
                        strokeWidth={2}
                    />
                </AreaChart>
            </ChartContainer>
        </div>
    )
}
