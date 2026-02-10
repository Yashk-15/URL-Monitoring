"use client"

import { useState } from "react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function AddURLDialog({ onURLAdded }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [formData, setFormData] = useState({
        name: "",
        url: "",
        region: "ap-south-1",
        expectedStatus: "200",
        maxLatencyMs: "3000",
        timeoutSeconds: "5"
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            // Generate URLid from name
            const URLid = formData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()

            const response = await apiClient.post('/urls', {
                URLid: URLid,
                name: formData.name,
                url: formData.url,
                region: formData.region,
                enabled: true,
                expectedStatus: parseInt(formData.expectedStatus),
                maxLatencyMs: parseInt(formData.maxLatencyMs),
                timeoutSeconds: parseInt(formData.timeoutSeconds)
            })

            if (!response.ok) {
                throw new Error(`Failed to add URL: ${response.status}`)
            }

            // Reset form and close dialog
            setFormData({
                name: "",
                url: "",
                region: "ap-south-1",
                expectedStatus: "200",
                maxLatencyMs: "3000",
                timeoutSeconds: "5"
            })
            setOpen(false)

            // Notify parent to refresh
            if (onURLAdded) onURLAdded()

        } catch (err) {
            console.error("Error adding URL:", err)
            setError(err.message || "Failed to add URL")
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

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add New URL to Monitor</DialogTitle>
                        <DialogDescription>
                            Enter the details of the URL you want to monitor. We'll check it regularly and alert you if it goes down.
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
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="url">URL *</Label>
                                <Input
                                    id="url"
                                    type="url"
                                    placeholder="https://example.com"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="region">Region</Label>
                                <Select
                                    value={formData.region}
                                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                                >
                                    <SelectTrigger id="region">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ap-south-1">Asia Pacific (Mumbai)</SelectItem>
                                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                                        <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                                        <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                                        <SelectItem value="global">Global</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="expectedStatus">Expected Status Code</Label>
                                    <Input
                                        id="expectedStatus"
                                        type="number"
                                        placeholder="200"
                                        value={formData.expectedStatus}
                                        onChange={(e) => setFormData({ ...formData, expectedStatus: e.target.value })}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="timeoutSeconds">Timeout (seconds)</Label>
                                    <Input
                                        id="timeoutSeconds"
                                        type="number"
                                        placeholder="5"
                                        value={formData.timeoutSeconds}
                                        onChange={(e) => setFormData({ ...formData, timeoutSeconds: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="maxLatencyMs">Max Latency (ms)</Label>
                                <Input
                                    id="maxLatencyMs"
                                    type="number"
                                    placeholder="3000"
                                    value={formData.maxLatencyMs}
                                    onChange={(e) => setFormData({ ...formData, maxLatencyMs: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Alert if response time exceeds this value
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Adding..." : "Add URL"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
