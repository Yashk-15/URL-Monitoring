"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
    IconBell,
    IconBellOff,
    IconCheck,
    IconWorld,
    IconSettings,
    IconAlertTriangle,
    IconRefresh,
} from "@tabler/icons-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

const LS_KEY_THRESHOLD = "urlmonitor_latency_threshold"
const LS_KEY_INTERVAL  = "urlmonitor_check_interval"

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50
                ${checked ? "bg-primary" : "bg-input"}
            `}
        >
            <span
                className={`
                    inline-block h-4 w-4 rounded-full bg-white shadow-md
                    transition-transform duration-200
                    ${checked ? "translate-x-6" : "translate-x-1"}
                `}
            />
        </button>
    )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        Up:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        Down:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        Warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        Unknown: "bg-muted text-muted-foreground",
    }
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${map[status] ?? map.Unknown}`}>
            {status}
        </span>
    )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, description, icon: Icon, children }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-muted">
                        <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
                    </div>
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SettingsTab({ data = [], loading = false, onRefresh }) {

    // ── Persisted preferences ─────────────────────────────────────────────────
    const [threshold, setThreshold] = useState("")
    const [interval,  setInterval_]  = useState("30s")
    const [notifPerm, setNotifPerm]  = useState("default") // "default" | "granted" | "denied"

    // Monitor enable/disable state keyed by id
    const [enabledMap, setEnabledMap] = useState({})
    const [togglingId, setTogglingId] = useState(null)

    // Load from localStorage on mount
    useEffect(() => {
        setThreshold(localStorage.getItem(LS_KEY_THRESHOLD) ?? "3000")
        setInterval_(localStorage.getItem(LS_KEY_INTERVAL) ?? "30s")
        if (typeof Notification !== "undefined") {
            setNotifPerm(Notification.permission)
        }
    }, [])

    // Initialise enabledMap from data
    useEffect(() => {
        const map = {}
        data.forEach(u => { map[u.id] = u.enabled ?? true })
        setEnabledMap(map)
    }, [data])

    // ── Handlers ──────────────────────────────────────────────────────────────
    const saveThreshold = () => {
        const val = parseInt(threshold)
        if (isNaN(val) || val < 100) {
            toast.error("Enter a valid threshold (min 100ms)")
            return
        }
        localStorage.setItem(LS_KEY_THRESHOLD, String(val))
        toast.success(`Latency threshold saved: ${val}ms`)
    }

    const saveInterval = (val) => {
        setInterval_(val)
        localStorage.setItem(LS_KEY_INTERVAL, val)
        toast.success(`Preferred interval saved: ${val}`)
    }

    const requestNotifications = async () => {
        if (typeof Notification === "undefined") {
            toast.error("Notifications not supported in this browser")
            return
        }
        const perm = await Notification.requestPermission()
        setNotifPerm(perm)
        if (perm === "granted") {
            toast.success("Browser notifications enabled!")
            new Notification("URL Monitor", { body: "Notifications are now active." })
        } else {
            toast.error("Notification permission denied.")
        }
    }

    const toggleMonitor = useCallback(async (url, enabled) => {
        setTogglingId(url.id)
        // Optimistic update
        setEnabledMap(prev => ({ ...prev, [url.id]: enabled }))
        try {
            const res = await apiClient.put(`/urls/${url.id}`, {
                ...url,
                enabled,
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            toast.success(`${url.name} ${enabled ? "enabled" : "disabled"}`)
            onRefresh?.()
        } catch {
            // Revert
            setEnabledMap(prev => ({ ...prev, [url.id]: !enabled }))
            toast.error(`Failed to update ${url.name}`)
        } finally {
            setTogglingId(null)
        }
    }, [onRefresh])

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 max-w-3xl">

            {/* ── Alert Thresholds ── */}
            <Section
                title="Alert Thresholds"
                description="Set when a monitor is treated as slow"
                icon={IconAlertTriangle}
            >
                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="latency-threshold">Latency Warning Threshold</Label>
                        <p className="text-xs text-muted-foreground">
                            Responses slower than this value will be flagged as "Warning".
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                id="latency-threshold"
                                type="number"
                                min={100}
                                step={100}
                                value={threshold}
                                onChange={e => setThreshold(e.target.value)}
                                className="w-36"
                                placeholder="3000"
                            />
                            <span className="text-sm text-muted-foreground">ms</span>
                            <Button size="sm" onClick={saveThreshold}>
                                <IconCheck className="size-3.5 mr-1" /> Save
                            </Button>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── Check Interval ── */}
            <Section
                title="Check Interval"
                description="How often you expect monitors to be checked (informational)"
                icon={IconSettings}
            >
                <div className="flex flex-col gap-1.5">
                    <Label>Preferred interval</Label>
                    <p className="text-xs text-muted-foreground">
                        Actual check frequency is controlled server-side. This is saved as a preference label.
                    </p>
                    <Select value={interval} onValueChange={saveInterval}>
                        <SelectTrigger className="w-44 mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30s">Every 30 seconds</SelectItem>
                            <SelectItem value="1m">Every 1 minute</SelectItem>
                            <SelectItem value="5m">Every 5 minutes</SelectItem>
                            <SelectItem value="15m">Every 15 minutes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Section>

            {/* ── Notifications ── */}
            <Section
                title="Browser Notifications"
                description="Get alerted when a monitor goes down"
                icon={notifPerm === "granted" ? IconBell : IconBellOff}
            >
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium">
                            {notifPerm === "granted"
                                ? "Notifications are enabled"
                                : notifPerm === "denied"
                                    ? "Notifications are blocked by your browser"
                                    : "Enable browser notifications"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {notifPerm === "granted"
                                ? "You'll receive alerts when a monitor goes down."
                                : notifPerm === "denied"
                                    ? "To unblock, update your browser's site permissions."
                                    : "Click to grant permission for desktop alerts."}
                        </p>
                    </div>
                    {notifPerm !== "denied" && (
                        <Button
                            variant={notifPerm === "granted" ? "outline" : "default"}
                            size="sm"
                            onClick={requestNotifications}
                            disabled={notifPerm === "granted"}
                        >
                            {notifPerm === "granted" ? (
                                <><IconCheck className="size-3.5 mr-1" /> Enabled</>
                            ) : (
                                <><IconBell className="size-3.5 mr-1" /> Enable</>
                            )}
                        </Button>
                    )}
                </div>
            </Section>

            {/* ── Monitor Management ── */}
            <Section
                title="Monitor Management"
                description="Enable or disable individual monitors"
                icon={IconWorld}
            >
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="skeleton h-10 w-full rounded-lg" />
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        No monitors added yet.
                    </p>
                ) : (
                    <div className="space-y-0 divide-y divide-border">
                        {data.map(url => {
                            const isEnabled = enabledMap[url.id] ?? true
                            const isToggling = togglingId === url.id
                            return (
                                <div key={url.id} className="flex items-center gap-3 py-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{url.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{url.url}</p>
                                    </div>
                                    <StatusBadge status={url.status} />
                                    <Toggle
                                        checked={isEnabled}
                                        onChange={(val) => toggleMonitor(url, val)}
                                        disabled={isToggling}
                                    />
                                </div>
                            )
                        })}
                    </div>
                )}

                {data.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                            <IconRefresh className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                            Refresh monitors
                        </Button>
                    </div>
                )}
            </Section>
        </div>
    )
}
