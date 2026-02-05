"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function LiveStatusIndicator({ status, className }) {
    const [pulse, setPulse] = useState(false)

    useEffect(() => {
        // Pulse animation for active statuses
        if (status === "Up" || status === "Down") {
            const interval = setInterval(() => {
                setPulse(prev => !prev)
            }, 2000)
            return () => clearInterval(interval)
        }
    }, [status])

    const getStatusConfig = () => {
        switch (status) {
            case "Up":
                return {
                    color: "bg-green-500",
                    label: "Online",
                    ring: "ring-green-500/20",
                    pulse: true
                }
            case "Down":
                return {
                    color: "bg-red-500",
                    label: "Offline",
                    ring: "ring-red-500/20",
                    pulse: true
                }
            case "Warning":
                return {
                    color: "bg-yellow-500",
                    label: "Slow",
                    ring: "ring-yellow-500/20",
                    pulse: false
                }
            default:
                return {
                    color: "bg-gray-400",
                    label: "Unknown",
                    ring: "ring-gray-400/20",
                    pulse: false
                }
        }
    }

    const config = getStatusConfig()

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="relative flex items-center justify-center">
                <div
                    className={cn(
                        "size-2 rounded-full",
                        config.color,
                        config.pulse && pulse && "animate-pulse"
                    )}
                />
                {config.pulse && (
                    <div
                        className={cn(
                            "absolute size-4 rounded-full ring-2",
                            config.ring,
                            pulse && "animate-ping"
                        )}
                    />
                )}
            </div>
            <span className="text-sm font-medium">{config.label}</span>
        </div>
    )
}
