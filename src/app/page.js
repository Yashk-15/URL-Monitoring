"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function Home() {
  const [urls, setUrls] = useState([]);
  const [selectedURLId, setSelectedURLId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingUrls, setLoadingUrls] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState({
    URLId: "",
    name: "",
    url: "",
    timeoutSeconds: 5,
    expectedStatus: 200,
    maxLatencyMs: 3000,
    enabled: true
  });

  // Fetch URLs
  async function fetchUrls() {
    setLoadingUrls(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/urls`);
      const data = await res.json();
      setUrls(data.urls || []);
    } catch (e) {
      setError("Failed to fetch URLs.");
    } finally {
      setLoadingUrls(false);
    }
  }

  // Fetch logs for a specific URL
  async function fetchLogs(URLId) {
    setLoadingLogs(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/logs?URLId=${encodeURIComponent(URLId)}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      setError("Failed to fetch logs.");
    } finally {
      setLoadingLogs(false);
    }
  }

  // Add new URL
  async function addUrl(e) {
    e.preventDefault();
    setError("");

    if (!form.URLId || !form.url) {
      setError("URLId and URL are required.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to add URL");
      }

      setForm({
        URLId: "",
        name: "",
        url: "",
        timeoutSeconds: 5,
        expectedStatus: 200,
        maxLatencyMs: 3000,
        enabled: true
      });

      setShowAddForm(false);
      await fetchUrls();
    } catch (e) {
      setError(e.message || "Failed to add URL.");
    }
  }

  // Delete URL
  async function deleteUrl(URLId) {
    if (!confirm(`Are you sure you want to delete ${URLId}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/urls/${encodeURIComponent(URLId)}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("Failed to delete URL");
      }

      if (selectedURLId === URLId) {
        setSelectedURLId("");
        setLogs([]);
      }

      await fetchUrls();
    } catch (e) {
      setError(e.message || "Failed to delete URL.");
    }
  }

  // Toggle URL enabled status
  async function toggleEnabled(url) {
    try {
      const res = await fetch(`${API_BASE}/urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...url, enabled: !url.enabled })
      });

      if (!res.ok) {
        throw new Error("Failed to update URL");
      }

      await fetchUrls();
    } catch (e) {
      setError(e.message || "Failed to update URL.");
    }
  }

  // Copy to clipboard
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  // Format timestamp to relative time
  function formatRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  // Get latency color
  function getLatencyColor(latencyMs, maxLatencyMs) {
    const ratio = latencyMs / maxLatencyMs;
    if (ratio < 0.5) return "text-green-400";
    if (ratio < 0.8) return "text-yellow-400";
    return "text-red-400";
  }

  // Filter URLs based on search
  const filteredUrls = urls.filter(u =>
    u.URLId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: urls.length,
    active: urls.filter(u => u.enabled).length,
    inactive: urls.filter(u => !u.enabled).length,
    up: urls.filter(u => u.lastCheck?.isUp).length,
    down: urls.filter(u => u.lastCheck && !u.lastCheck.isUp).length
  };

  useEffect(() => {
    if (!API_BASE) {
      setError("Missing NEXT_PUBLIC_API_BASE in .env.local");
      return;
    }
    fetchUrls();
  }, []);

  useEffect(() => {
    if (selectedURLId) fetchLogs(selectedURLId);
  }, [selectedURLId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              URL Monitor
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              AWS Lambda + EventBridge + DynamoDB + SNS
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchUrls}
              disabled={loadingUrls}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingUrls ? "Refreshing..." : "🔄 Refresh"}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold"
            >
              {showAddForm ? "✕ Cancel" : "+ Add URL"}
            </button>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 flex items-start gap-3 animate-slide-in">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard label="Total URLs" value={stats.total} icon="🌐" color="indigo" />
          <StatCard label="Active" value={stats.active} icon="✓" color="green" />
          <StatCard label="Inactive" value={stats.inactive} icon="⏸" color="slate" />
          <StatCard label="Up" value={stats.up} icon="↑" color="emerald" />
          <StatCard label="Down" value={stats.down} icon="↓" color="red" />
        </div>

        {/* Add URL Form */}
        {showAddForm && (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 animate-slide-in">
            <h2 className="text-xl font-semibold mb-4">Add New URL</h2>
            <form onSubmit={addUrl} className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">URLId *</label>
                <input
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 outline-none focus:border-indigo-500"
                  placeholder="my-website"
                  value={form.URLId}
                  onChange={(e) => setForm({ ...form, URLId: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Name</label>
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 outline-none focus:border-indigo-500"
                  placeholder="My Website"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm text-slate-400 mb-2">URL *</label>
                <input
                  required
                  type="url"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 outline-none focus:border-indigo-500"
                  placeholder="https://example.com"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Timeout (seconds)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 outline-none focus:border-indigo-500"
                  value={form.timeoutSeconds}
                  onChange={(e) => setForm({ ...form, timeoutSeconds: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Expected Status</label>
                <input
                  type="number"
                  min="100"
                  max="599"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 outline-none focus:border-indigo-500"
                  value={form.expectedStatus}
                  onChange={(e) => setForm({ ...form, expectedStatus: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Max Latency (ms)</label>
                <input
                  type="number"
                  min="100"
                  max="30000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 outline-none focus:border-indigo-500"
                  value={form.maxLatencyMs}
                  onChange={(e) => setForm({ ...form, maxLatencyMs: Number(e.target.value) })}
                />
              </div>

              <div className="md:col-span-3 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-semibold"
                >
                  Add URL
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* URL List */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Monitored URLs</h2>
                <span className="text-sm text-slate-400">{filteredUrls.length}</span>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="🔍 Search URLs..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 mb-4 outline-none focus:border-indigo-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* URL List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {loadingUrls ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : filteredUrls.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm">No URLs found</p>
                  </div>
                ) : (
                  filteredUrls.map((u, index) => (
                    <URLCard
                      key={`url-${u.URLId}-${index}`}
                      url={u}
                      isSelected={selectedURLId === u.URLId}
                      onSelect={() => setSelectedURLId(u.URLId)}
                      onDelete={() => deleteUrl(u.URLId)}
                      onToggle={() => toggleEnabled(u)}
                      onCopy={() => copyToClipboard(u.url)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-5 h-full">
              <h2 className="text-lg font-semibold mb-4">
                {selectedURLId ? `Logs for ${selectedURLId}` : "Latest Logs"}
              </h2>

              {!selectedURLId ? (
                <div className="text-center py-20 text-slate-400">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-lg">Select a URL to view logs</p>
                  <p className="text-sm mt-2">Click on any URL from the list to see its monitoring history</p>
                </div>
              ) : loadingLogs ? (
                <div className="space-y-3">
                  <SkeletonLog />
                  <SkeletonLog />
                  <SkeletonLog />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-lg">No logs yet</p>
                  <p className="text-sm mt-2">Logs will appear here once monitoring starts</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {logs.map((l, index) => (
                    <LogCard
                      key={`${selectedURLId}-${l.Timestamp}-${index}`}
                      log={l}
                      formatTime={formatRelativeTime}
                      getLatencyColor={getLatencyColor}
                      maxLatency={urls.find(u => u.URLId === selectedURLId)?.maxLatencyMs || 3000}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon, color }) {
  const colorClasses = {
    indigo: "from-indigo-500/20 to-indigo-600/20 border-indigo-500/30",
    green: "from-green-500/20 to-green-600/20 border-green-500/30",
    slate: "from-slate-500/20 to-slate-600/20 border-slate-500/30",
    emerald: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/30",
    red: "from-red-500/20 to-red-600/20 border-red-500/30"
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm rounded-xl p-4 animate-slide-in`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

// URL Card Component
function URLCard({ url, isSelected, onSelect, onDelete, onToggle, onCopy }) {
  return (
    <div
      className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${isSelected
          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20"
          : "border-slate-800 bg-slate-950/50 hover:bg-slate-900 hover:border-slate-700"
        }`}
    >
      <div onClick={onSelect}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{url.name || url.URLId}</h3>
              {url.enabled ? (
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></span>
              ) : (
                <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
              )}
            </div>
            <p className="text-xs text-slate-400 break-all line-clamp-1">{url.url}</p>
          </div>
        </div>

        {url.lastCheck && (
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 text-xs rounded-full ${url.lastCheck.isUp ? "bg-green-600" : "bg-red-600"}`}>
              {url.lastCheck.isUp ? "UP" : "DOWN"}
            </span>
            {url.lastCheck.latencyMs && (
              <span className="text-xs text-slate-400">{url.lastCheck.latencyMs}ms</span>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 mt-3 pt-3 border-t border-slate-800">
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          className="flex-1 px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700"
          title="Copy URL"
        >
          📋
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="flex-1 px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700"
          title={url.enabled ? "Disable" : "Enable"}
        >
          {url.enabled ? "⏸" : "▶"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex-1 px-2 py-1 text-xs rounded bg-red-900/30 hover:bg-red-900/50 text-red-400"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// Log Card Component
function LogCard({ log, formatTime, getLatencyColor, maxLatency }) {
  return (
    <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/50 hover:bg-slate-900/50 transition-all animate-slide-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{log.Timestamp}</span>
            <span className="text-xs text-slate-500">{formatTime(log.Timestamp)}</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">
              Status: <span className={log.statusCode >= 200 && log.statusCode < 300 ? "text-green-400" : "text-red-400"}>
                {log.statusCode ?? "ERROR"}
              </span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Latency: <span className={getLatencyColor(log.latencyMs, maxLatency)}>
                {log.latencyMs}ms
              </span>
            </span>
            {log.isSlow && (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-yellow-400 text-xs">⚠ SLOW</span>
              </>
            )}
          </div>

          {log.errorMsg && (
            <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
              Error: {log.errorMsg}
            </div>
          )}
        </div>

        <span className={`px-3 py-1 text-xs rounded-full font-semibold ${log.isUp ? "bg-green-600" : "bg-red-600"
          }`}>
          {log.isUp ? "UP" : "DOWN"}
        </span>
      </div>
    </div>
  );
}

// Skeleton Components
function SkeletonCard() {
  return (
    <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/50">
      <div className="skeleton h-4 w-3/4 rounded mb-2"></div>
      <div className="skeleton h-3 w-full rounded"></div>
    </div>
  );
}

function SkeletonLog() {
  return (
    <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/50">
      <div className="skeleton h-4 w-1/2 rounded mb-2"></div>
      <div className="skeleton h-3 w-3/4 rounded"></div>
    </div>
  );
}
