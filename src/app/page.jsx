"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const URLS = [
    "https://api.myapp.com/health",
    "https://store.example.com",
    "https://dashboard.acme.io",
    "https://cdn.assets.net",
    "https://auth.service.dev",
]

const LATENCY = [142, 89, null, 201, 67]
const BAR_HEIGHTS = [60, 80, 55, 90, 72, 95, 88, 65, 100, 78, 92, 84, 70, 96, 83]

export default function SplashPage() {
    const router = useRouter()
    const [phase, setPhase] = useState(0)
    const [pingIdx, setPingIdx] = useState(0)
    const [urlsVisible, setUrlsVisible] = useState([false, false, false, false, false])
    const [barHeights, setBarHeights] = useState(BAR_HEIGHTS.map(() => 0))
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 500)
        const t2 = setTimeout(() => setPhase(2), 1300)
        const t3 = setTimeout(() => setIsExiting(true), 3000)
        const t4 = setTimeout(() => router.push("/login"), 3600)
        return () => [t1, t2, t3, t4].forEach(clearTimeout)
    }, [router])

    useEffect(() => {
        if (phase < 1) return
        URLS.forEach((_, i) => {
            setTimeout(() => {
                setUrlsVisible(prev => { const n = [...prev]; n[i] = true; return n })
            }, i * 130)
        })
    }, [phase])

    useEffect(() => {
        if (phase < 2) return
        BAR_HEIGHTS.forEach((h, i) => {
            setTimeout(() => {
                setBarHeights(prev => { const n = [...prev]; n[i] = h; return n })
            }, i * 55)
        })
    }, [phase])

    useEffect(() => {
        if (phase < 1) return
        const interval = setInterval(() => setPingIdx(p => (p + 1) % URLS.length), 650)
        return () => clearInterval(interval)
    }, [phase])

    return (
        <div style={{
            minHeight: "100vh",
            background: "var(--background, #ffffff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            overflow: "hidden",
            transition: "opacity 0.6s ease, transform 0.6s ease",
            opacity: isExiting ? 0 : 1,
            transform: isExiting ? "scale(1.03)" : "scale(1)",
        }}>
            {}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 700px 400px at 50% -10%, rgba(0,0,0,0.04) 0%, transparent 70%)",
            }} />

            <div style={{
                position: "relative",
                width: "100%",
                maxWidth: 460,
                padding: "0 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 28,
            }}>
                {}
                {}
                <div style={{
                    animation: "fadeSlideUp 0.4s ease both",
                    textAlign: "center",
                }}>
                    <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                        {"WELCOME".split("").map((char, i) => (
                            <span key={i} style={{
                                fontSize: 13,
                                fontWeight: 700,
                                letterSpacing: "0.22em",
                                color: "var(--muted-foreground, #888)",
                                textTransform: "uppercase",
                                animation: `letterReveal 0.4s ease both`,
                                animationDelay: `${i * 60}ms`,
                                opacity: 0,
                            }}>{char}</span>
                        ))}
                    </div>
                </div>

                <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                    animation: "fadeSlideUp 0.55s ease 0.5s both",
                }}>
                    <div style={{
                        width: 68, height: 68,
                        borderRadius: 18,
                        border: "1.5px solid rgba(0,0,0,0.12)",
                        background: "linear-gradient(145deg, rgba(0,0,0,0.03), rgba(0,0,0,0.01))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                        position: "relative",
                    }}>
                        {}
                        <div style={{
                            position: "absolute", width: 68, height: 68, borderRadius: 18,
                            border: "1.5px solid rgba(0,0,0,0.15)",
                            animation: "pingRing 2.2s ease-out infinite",
                        }} />
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary, #1a1a1a)" }}>
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--foreground, #111)", letterSpacing: "-0.4px" }}>
                            URL Monitor
                        </h1>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground, #888)" }}>
                            Real-time uptime &amp; performance tracking
                        </p>
                    </div>
                </div>

                {}
                <div style={{
                    width: "100%",
                    border: "1px solid var(--border, #e5e7eb)",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "var(--card, #fff)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    animation: "fadeSlideUp 0.55s ease 0.15s both",
                }}>
                    {}
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "9px 14px",
                        borderBottom: "1px solid var(--border, #e5e7eb)",
                        background: "rgba(0,0,0,0.015)",
                    }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground, #888)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            Monitored Endpoints
                        </span>
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", animation: "pulseDot 1.8s ease-in-out infinite" }} />
                            <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Live</span>
                        </div>
                    </div>

                    {URLS.map((url, i) => (
                        <div key={url} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "9px 14px",
                            borderBottom: i < URLS.length - 1 ? "1px solid var(--border, #f0f0f0)" : "none",
                            transition: "opacity 0.32s ease, transform 0.32s ease",
                            opacity: urlsVisible[i] ? 1 : 0,
                            transform: urlsVisible[i] ? "translateX(0)" : "translateX(-10px)",
                        }}>
                            {}
                            <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: "50%",
                                    background: i === 2 ? "#d97706" : "#16a34a",
                                }} />
                                {pingIdx === i && (
                                    <div style={{
                                        position: "absolute", inset: -3, borderRadius: "50%",
                                        border: `1.5px solid ${i === 2 ? "#d97706" : "#16a34a"}`,
                                        animation: "pingSmall 0.75s ease-out forwards",
                                    }} />
                                )}
                            </div>
                            <span style={{
                                fontSize: 12, flex: 1,
                                color: "var(--muted-foreground, #666)",
                                fontFamily: "var(--font-geist-mono), monospace",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{url}</span>
                            <span style={{
                                fontSize: 11, fontWeight: 600, flexShrink: 0,
                                color: i === 2 ? "#d97706" : "#16a34a",
                            }}>
                                {LATENCY[i] ? `${LATENCY[i]}ms` : "—"}
                            </span>
                        </div>
                    ))}
                </div>

                {}
                <div style={{
                    width: "100%", display: "flex", gap: 12,
                    transition: "opacity 0.45s ease, transform 0.45s ease",
                    opacity: phase >= 2 ? 1 : 0,
                    transform: phase >= 2 ? "translateY(0)" : "translateY(8px)",
                }}>
                    {}
                    <div style={{
                        flex: 2,
                        border: "1px solid var(--border, #e5e7eb)",
                        borderRadius: 14, padding: "12px 14px",
                        background: "var(--card, #fff)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}>
                        <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 600, color: "var(--muted-foreground, #888)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                            30-day Uptime
                        </p>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 34 }}>
                            {barHeights.map((h, i) => (
                                <div key={i} style={{
                                    flex: 1,
                                    height: `${Math.max(h, 2)}%`,
                                    background: h > 85 ? "rgba(22,163,74,0.75)" : h > 65 ? "rgba(22,163,74,0.4)" : "rgba(217,119,6,0.55)",
                                    borderRadius: 3,
                                    transition: `height 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 50}ms`,
                                }} />
                            ))}
                        </div>
                        <p style={{ margin: "8px 0 0", fontSize: 20, fontWeight: 700, color: "var(--foreground, #111)" }}>99.8%</p>
                    </div>

                    {}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                            { label: "Alerts Today", value: "2", accent: "#d97706" },
                            { label: "Avg Latency",  value: "124ms", accent: "#16a34a" },
                        ].map(s => (
                            <div key={s.label} style={{
                                flex: 1,
                                border: "1px solid var(--border, #e5e7eb)",
                                borderRadius: 14, padding: "10px 14px",
                                background: "var(--card, #fff)",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                                display: "flex", flexDirection: "column", justifyContent: "space-between",
                            }}>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "var(--muted-foreground, #888)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                    {s.label}
                                </p>
                                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: s.accent }}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {}
                <div style={{
                    width: "55%", height: 2, borderRadius: 2,
                    background: "var(--border, #e5e7eb)", overflow: "hidden",
                }}>
                    <div style={{
                        height: "100%",
                        background: "var(--foreground, #111)",
                        animation: "loadBar 3.2s linear forwards",
                        borderRadius: 2,
                    }} />
                </div>
            </div>

            <style>{`
                @keyframes letterReveal {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes pingRing {
                    0%   { transform: scale(1);    opacity: 0.6; }
                    100% { transform: scale(1.6);  opacity: 0; }
                }
                @keyframes pingSmall {
                    0%   { transform: scale(1);   opacity: 1; }
                    100% { transform: scale(2.8); opacity: 0; }
                }
                @keyframes pulseDot {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.45; }
                }
                @keyframes loadBar {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
            `}</style>
        </div>
    )
}
