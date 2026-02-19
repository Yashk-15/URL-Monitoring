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
    const [loading, setLoading] = useState(false)
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

        // Client-side validation
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

        setLoading(true)

        try {
            const payload = {
                URLid: generateURLid(formData.name),
                name: formData.name.trim(),
                url: formData.url.trim(),
                enabled: true,
                expectedStatus: parseInt(formData.expectedStatus) || 200,
                maxLatencyMs: maxLatency,
                timeoutSeconds: timeout,
            }

            const response = await apiClient.post('/urls', payload)

            if (!response.ok) {
                const body = await response.text()
                throw new Error(`Failed to add URL: ${response.status} ${body}`)
            }

            // Close dialog, reset form, notify parent
            handleOpenChange(false)
            toast.success(`"${formData.name}" added to monitoring`)

            // Small delay to let DynamoDB propagate before refreshing
            setTimeout(() => {
                if (onURLAdded) onURLAdded()
            }, 800)
        } catch (err) {
            console.error("Error adding URL:", err)
            setError(err.message || "Failed to add URL. Please try again.")
            toast.error("Failed to add URL")
        } finally {
            setLoading(false)
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
                                    disabled={loading}
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
                                    disabled={loading}
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
                                        disabled={loading}
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
                                        disabled={loading}
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
                                    disabled={loading}
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
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                                        Adding...
                                    </span>
                                ) : (
                                    "Add URL"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
