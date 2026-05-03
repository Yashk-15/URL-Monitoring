"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    IconRefresh,
    IconSearch,
    IconExternalLink,
    IconCircleCheckFilled,
    IconAlertTriangle,
    IconCircleXFilled,
    IconLoader,
    IconClockHour4,
} from "@tabler/icons-react"

const TOP_SITES = [
    { name: "Google",        url: "https://www.google.com",         category: "Search" },
    { name: "Bing",          url: "https://www.bing.com",           category: "Search" },
    { name: "DuckDuckGo",    url: "https://duckduckgo.com",         category: "Search" },
    { name: "Yahoo",         url: "https://www.yahoo.com",          category: "Search" },
    { name: "Baidu",         url: "https://www.baidu.com",          category: "Search" },
    { name: "Facebook",      url: "https://www.facebook.com",       category: "Social" },
    { name: "Instagram",     url: "https://www.instagram.com",      category: "Social" },
    { name: "Twitter / X",   url: "https://x.com",                  category: "Social" },
    { name: "LinkedIn",      url: "https://www.linkedin.com",       category: "Social" },
    { name: "Reddit",        url: "https://www.reddit.com",         category: "Social" },
    { name: "TikTok",        url: "https://www.tiktok.com",         category: "Social" },
    { name: "Pinterest",     url: "https://www.pinterest.com",      category: "Social" },
    { name: "Snapchat",      url: "https://www.snapchat.com",       category: "Social" },
    { name: "Quora",         url: "https://www.quora.com",          category: "Social" },
    { name: "Tumblr",        url: "https://www.tumblr.com",         category: "Social" },
    { name: "YouTube",       url: "https://www.youtube.com",        category: "Video" },
    { name: "Netflix",       url: "https://www.netflix.com",        category: "Video" },
    { name: "Twitch",        url: "https://www.twitch.tv",          category: "Video" },
    { name: "Vimeo",         url: "https://vimeo.com",              category: "Video" },
    { name: "Disney+",       url: "https://www.disneyplus.com",     category: "Video" },
    { name: "GitHub",        url: "https://github.com",             category: "Tech" },
    { name: "Stack Overflow",url: "https://stackoverflow.com",      category: "Tech" },
    { name: "GitLab",        url: "https://gitlab.com",             category: "Tech" },
    { name: "npm",           url: "https://www.npmjs.com",          category: "Tech" },
    { name: "MDN",           url: "https://developer.mozilla.org",  category: "Tech" },
    { name: "Vercel",        url: "https://vercel.com",             category: "Tech" },
    { name: "Netlify",       url: "https://www.netlify.com",        category: "Tech" },
    { name: "Cloudflare",    url: "https://www.cloudflare.com",     category: "Tech" },
    { name: "AWS",           url: "https://aws.amazon.com",         category: "Tech" },
    { name: "Heroku",        url: "https://www.heroku.com",         category: "Tech" },
    { name: "Amazon",        url: "https://www.amazon.com",         category: "Shopping" },
    { name: "eBay",          url: "https://www.ebay.com",           category: "Shopping" },
    { name: "Alibaba",       url: "https://www.alibaba.com",        category: "Shopping" },
    { name: "Etsy",          url: "https://www.etsy.com",           category: "Shopping" },
    { name: "Shopify",       url: "https://www.shopify.com",        category: "Shopping" },
    { name: "Flipkart",      url: "https://www.flipkart.com",       category: "Shopping" },
    { name: "BBC",           url: "https://www.bbc.com",            category: "News" },
    { name: "CNN",           url: "https://www.cnn.com",            category: "News" },
    { name: "Reuters",       url: "https://www.reuters.com",        category: "News" },
    { name: "The Guardian",  url: "https://www.theguardian.com",    category: "News" },
    { name: "NY Times",      url: "https://www.nytimes.com",        category: "News" },
    { name: "Al Jazeera",    url: "https://www.aljazeera.com",      category: "News" },
    { name: "PayPal",        url: "https://www.paypal.com",         category: "Finance" },
    { name: "Stripe",        url: "https://stripe.com",             category: "Finance" },
    { name: "Coinbase",      url: "https://www.coinbase.com",       category: "Finance" },
    { name: "Robinhood",     url: "https://robinhood.com",          category: "Finance" },
    { name: "Bloomberg",     url: "https://www.bloomberg.com",      category: "Finance" },
    { name: "Notion",        url: "https://www.notion.so",          category: "Productivity" },
    { name: "Slack",         url: "https://slack.com",              category: "Productivity" },
    { name: "Zoom",          url: "https://zoom.us",                category: "Productivity" },
    { name: "Trello",        url: "https://trello.com",             category: "Productivity" },
    { name: "Jira",          url: "https://www.atlassian.com",      category: "Productivity" },
    { name: "Figma",         url: "https://www.figma.com",          category: "Productivity" },
    { name: "Dropbox",       url: "https://www.dropbox.com",        category: "Productivity" },
    { name: "Google Drive",  url: "https://drive.google.com",       category: "Productivity" },
    { name: "Wikipedia",     url: "https://www.wikipedia.org",      category: "Education" },
    { name: "Coursera",      url: "https://www.coursera.org",       category: "Education" },
    { name: "Udemy",         url: "https://www.udemy.com",          category: "Education" },
    { name: "Khan Academy",  url: "https://www.khanacademy.org",    category: "Education" },
    { name: "Medium",        url: "https://medium.com",             category: "Education" },
    { name: "Cloudflare CDN",url: "https://1.1.1.1",               category: "Infrastructure" },
    { name: "Google DNS",    url: "https://8.8.8.8",               category: "Infrastructure" },
    { name: "Akamai",        url: "https://www.akamai.com",         category: "Infrastructure" },
    { name: "Steam",         url: "https://store.steampowered.com", category: "Gaming" },
    { name: "Epic Games",    url: "https://www.epicgames.com",      category: "Gaming" },
    { name: "PlayStation",   url: "https://www.playstation.com",    category: "Gaming" },
    { name: "Xbox",          url: "https://www.xbox.com",           category: "Gaming" },
    { name: "OpenAI",        url: "https://openai.com",             category: "AI" },
    { name: "Anthropic",     url: "https://www.anthropic.com",      category: "AI" },
    { name: "Hugging Face",  url: "https://huggingface.co",         category: "AI" },
    { name: "Perplexity",    url: "https://www.perplexity.ai",      category: "AI" },
    { name: "Spotify",       url: "https://www.spotify.com",        category: "Music" },
    { name: "SoundCloud",    url: "https://soundcloud.com",         category: "Music" },
    { name: "Apple",         url: "https://www.apple.com",          category: "Tech" },
    { name: "Microsoft",     url: "https://www.microsoft.com",      category: "Tech" },
].map((s, i) => ({ ...s, id: i }))

const CATEGORIES = ["All", ...Array.from(new Set(TOP_SITES.map(s => s.category))).sort()]

const LATENCY_WARNING = 1500

async function* streamPingBatch(sites, signal) {
    const res = await fetch('/api/ping-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: sites.map(s => ({ id: s.id, url: s.url })) }),
        signal,
    })
    if (!res.ok || !res.body) return

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop()
        for (const part of parts) {
            const line = part.replace(/^data:\s*/, '').trim()
            if (!line) continue
            try { yield JSON.parse(line) } catch {  }
        }
    }
}

function StatusPill({ status }) {
    if (status === "Up") return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <IconCircleCheckFilled className="size-3" /> Up
        </span>
    )
    if (status === "Down") return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <IconCircleXFilled className="size-3" /> Down
        </span>
    )
    if (status === "Warning") return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <IconAlertTriangle className="size-3" /> Slow
        </span>
    )
    if (status === "Checking") return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground animate-pulse">
            <IconLoader className="size-3 animate-spin" /> Checking
        </span>
    )
    return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            — Not checked
        </span>
    )
}

function SiteCard({ site }) {
    const { name, url, category, status, responseTime, statusCode } = site

    const latencyColor = !responseTime ? "text-muted-foreground"
        : responseTime < 500  ? "text-green-600 dark:text-green-400"
        : responseTime < 1200 ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400"

    const isDown = status === "Down" || status === "Error"

    return (
        <div className={`group relative rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30 ${isDown ? "border-red-200 dark:border-red-900/40" : ""}`}>
            {}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{name}</p>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground truncate hover:text-primary flex items-center gap-1 mt-0.5 w-fit max-w-full"
                    >
                        <span className="truncate">{url.replace("https://", "")}</span>
                        <IconExternalLink className="size-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                </div>
                <StatusPill status={status} />
            </div>

            {}
            <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-normal">
                    {category}
                </Badge>
                <div className="flex items-center gap-3 text-xs">
                    {responseTime != null && (
                        <span className={`font-mono font-semibold flex items-center gap-1 ${latencyColor}`}>
                            <IconClockHour4 className="size-3" />
                            {responseTime}ms
                        </span>
                    )}
                    {statusCode != null && (
                        <span className="font-mono text-muted-foreground">
                            HTTP {statusCode}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export function GlobalMonitorTab() {
    const [siteData, setSiteData] = useState(
        TOP_SITES.reduce((acc, s) => ({ ...acc, [s.id]: { ...s, status: null } }), {})
    )
    const [checking, setChecking] = useState(false)
    const [progress, setProgress] = useState(0)
    const [search, setSearch] = useState("")
    const [category, setCategory] = useState("All")
    const [sortBy, setSortBy] = useState("default")
    const abortCtrlRef = useRef(null)

    const checkAll = useCallback(async () => {
        setChecking(true)
        setProgress(0)

        abortCtrlRef.current?.abort()
        const ctrl = new AbortController()
        abortCtrlRef.current = ctrl

        setSiteData(prev => {
            const next = { ...prev }
            TOP_SITES.forEach(s => {
                next[s.id] = { ...next[s.id], status: "Checking", responseTime: null, statusCode: null, errorMsg: null }
            })
            return next
        })

        let done = 0
        try {
            for await (const event of streamPingBatch(TOP_SITES, ctrl.signal)) {
                if (event.done) break
                setSiteData(prev => ({
                    ...prev,
                    [event.id]: { ...prev[event.id], ...event }
                }))
                done++
                setProgress(Math.round((done / TOP_SITES.length) * 100))
            }
        } catch (err) {
            if (err?.name !== 'AbortError') console.error('Ping batch error:', err)
        }

        setChecking(false)
    }, [])

    const stopCheck = () => {
        abortCtrlRef.current?.abort()
        setChecking(false)
    }

    const sites = Object.values(siteData)
        .filter(s => {
            const matchCat = category === "All" || s.category === category
            const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.url.toLowerCase().includes(search.toLowerCase())
            return matchCat && matchSearch
        })
        .sort((a, b) => {
            if (sortBy === "latency") return (a.responseTime ?? Infinity) - (b.responseTime ?? Infinity)
            if (sortBy === "status") {
                const order = { Down: 0, Error: 1, Warning: 2, Checking: 3, Up: 4 }
                return (order[a.status] ?? 5) - (order[b.status] ?? 5)
            }
            return a.id - b.id
        })

    const checked = Object.values(siteData).filter(s => s.status && s.status !== "Checking").length
    const upCount   = Object.values(siteData).filter(s => s.status === "Up").length
    const downCount = Object.values(siteData).filter(s => s.status === "Down" || s.status === "Error").length
    const slowCount = Object.values(siteData).filter(s => s.status === "Warning").length

    return (
        <div className="space-y-4">
            {}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold tracking-tight">Global Monitor</h2>
                    <p className="text-sm text-muted-foreground">
                        Live status of top {TOP_SITES.length} websites worldwide
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {checking && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <IconLoader className="size-4 animate-spin" />
                            <span>{progress}%</span>
                        </div>
                    )}
                    {checking ? (
                        <Button variant="outline" size="sm" onClick={stopCheck}>
                            Stop
                        </Button>
                    ) : (
                        <Button size="sm" onClick={checkAll} className="gap-1.5">
                            <IconRefresh className="size-4" />
                            Check All
                        </Button>
                    )}
                </div>
            </div>

            {}
            {checked > 0 && (
                <div className="flex gap-4 flex-wrap text-sm">
                    <span className="text-muted-foreground">{checked}/{TOP_SITES.length} checked</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{upCount} Up</span>
                    {downCount > 0 && <span className="text-red-600 dark:text-red-400 font-medium">{downCount} Down</span>}
                    {slowCount > 0 && <span className="text-yellow-600 dark:text-yellow-400 font-medium">{slowCount} Slow</span>}
                </div>
            )}

            {}
            {checking && (
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                                category === cat
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search sites…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-8 w-44 text-sm"
                        />
                    </div>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="default">Default order</option>
                        <option value="status">Sort: Issues first</option>
                        <option value="latency">Sort: Fastest first</option>
                    </select>
                </div>
            </div>

            {}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sites.map(site => (
                    <SiteCard key={site.id} site={site} />
                ))}
                {sites.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                        No sites match your filter.
                    </div>
                )}
            </div>
        </div>
    )
}
