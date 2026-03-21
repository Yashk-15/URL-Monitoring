"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api-client"
import { IconPlus } from "@tabler/icons-react"

const DEFAULT_FORM = {
    name: "",
    url: "",
    expectedStatus: "200",
    maxLatencyMs: "3000",
    timeoutSeconds: "5",
}

/**
 * Generate a clean URLid from a name.
 * Must be safe for use as a DynamoDB partition key.
 */
function generateURLid(name) {
    const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\-_]/g, '-')   // replace special chars with hyphen
        .replace(/-+/g, '-')               // collapse multiple hyphens
        .replace(/^-|-$/g, '')             // strip leading/trailing hyphens
        .slice(0, 60)                      // max 60 chars before timestamp
    return `${slug}-${Date.now()}`
}

export function AddURLDialog({ onURLAdded }) {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState("")
    const [formData, setFormData] = useState(DEFAULT_FORM)

    const updateField = (field) => (e) =>
        setFormData((prev) => ({ ...prev, [field]: e.target.value }))

    const resetForm = () => {
        setFormData(DEFAULT_FORM)
        setError("")
    }

    const handleOpenChange = (isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetForm()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")

        // ── Client-side validation ─────────────────────────────────────────────
        if (!formData.name.trim()) {
            setError("Name is required")
            return
        }
        if (!formData.url.trim()) {
            setError("URL is required")
            return
        }
        try {
            new URL(formData.url)
        } catch {
            setError("Please enter a valid URL including https://")
            return
        }
        const maxLatency = parseInt(formData.maxLatencyMs)
        if (isNaN(maxLatency) || maxLatency < 100 || maxLatency > 30000) {
            setError("Max latency must be between 100ms and 30,000ms")
            return
        }
        const timeout = parseInt(formData.timeoutSeconds)
        if (isNaN(timeout) || timeout < 1 || timeout > 30) {
            setError("Timeout must be between 1 and 30 seconds")
            return
        }

        const payload = {
            URLid: generateURLid(formData.name),
            name: formData.name.trim(),
            url: formData.url.trim(),
            enabled: true,
            expectedStatus: parseInt(formData.expectedStatus) || 200,
            maxLatencyMs: maxLatency,
            timeoutSeconds: timeout,
        }

        // ── Optimistic update: close immediately and show the row now ──────────
        // The parent's onURLAdded adds the row to the table instantly (with
        // "Unknown" status) before the POST even completes. This makes the UX
        // feel instant regardless of Lambda / network latency.
        handleOpenChange(false)
        if (onURLAdded) onURLAdded(payload)
        toast.success(`"${payload.name}" added — monitoring will start shortly`)

        // ── Background POST ────────────────────────────────────────────────────
        // Fire-and-forget. The row is already visible so the user isn't blocked.
        // The hook's background re-fetch (2s later) will replace the optimistic
        // row with real server data.
        try {
            const response = await apiClient.post('/urls', payload)
            if (!response.ok) {
                const body = await response.text().catch(() => '')
                throw new Error(`Server returned ${response.status}: ${body}`)
            }
        } catch (err) {
            console.error("Error adding URL:", err)
            // Show a toast so the user knows the save failed,
            // but don't re-open the dialog to avoid disruption.
            toast.error(
                `Failed to save "${payload.name}" — it may not persist after refresh. ${err.message || ''}`,
                { duration: 8000 }
            )
        }
    }

    return (
        <>
            <Button onClick={() => setOpen(true)} className="gap-2">
                <IconPlus className="size-4" />
                Add URL
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add URL to Monitor</DialogTitle>
                        <DialogDescription>
                            Enter the URL details below. Monitoring will begin immediately after adding.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            {error && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="My Website"
                                    value={formData.name}
                                    onChange={updateField("name")}
                                    required
                                    maxLength={80}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="url">URL *</Label>
                                <Input
                                    id="url"
                                    type="url"
                                    placeholder="https://example.com"
                                    value={formData.url}
                                    onChange={updateField("url")}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Must include https:// or http://
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="expectedStatus">Expected Status Code</Label>
                                    <Input
                                        id="expectedStatus"
                                        type="number"
                                        placeholder="200"
                                        min="100"
                                        max="599"
                                        value={formData.expectedStatus}
                                        onChange={updateField("expectedStatus")}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="timeoutSeconds">Timeout (seconds)</Label>
                                    <Input
                                        id="timeoutSeconds"
                                        type="number"
                                        placeholder="5"
                                        min="1"
                                        max="30"
                                        value={formData.timeoutSeconds}
                                        onChange={updateField("timeoutSeconds")}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="maxLatencyMs">Alert threshold (ms)</Label>
                                <Input
                                    id="maxLatencyMs"
                                    type="number"
                                    placeholder="3000"
                                    min="100"
                                    max="30000"
                                    value={formData.maxLatencyMs}
                                    onChange={updateField("maxLatencyMs")}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Mark as "Warning" if response time exceeds this value
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                Add URL
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
