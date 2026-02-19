"use client"

import * as React from "react"
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircleCheckFilled,
    IconDotsVertical,
    IconLoader,
    IconSearch,
    IconX,
    IconExternalLink,
} from "@tabler/icons-react"
import {
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { URLPerformanceChart } from "./url-performance-chart"
import { apiClient, extractArray, normaliseLog } from "@/lib/api-client"

/**
 * Fetch performance logs for a specific URL from URL_Health_details.
 * GET /logs?urlId={URLid}&limit=48
 * PK = URLid, SK = Timestamp
 */
async function fetchPerformanceData(urlId) {
    if (!urlId) return []
    try {
        const response = await apiClient.get(`/logs?urlId=${encodeURIComponent(urlId)}&limit=48`)

        if (!response.ok) {
            console.warn(`[URLListTable] /logs?urlId=${urlId} returned ${response.status}`)
            return []
        }

        const result = await response.json()
        const raw = extractArray(result)
        const normalised = raw.map(normaliseLog)

        return normalised
            .filter((log) => log.responseTime > 0 && log.timestamp)
            .map((log) => ({
                timestamp: new Date(log.timestamp).getTime(),
                responseTime: log.responseTime,
                isUp: log.isUp,
                statusCode: log.statusCode,
            }))
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-48)
    } catch (err) {
        console.error('[URLListTable] Error fetching performance data:', err)
        return []
    }
}

function StatusBadge({ status }) {
    if (status === "Up") {
        return (
            <Badge className="px-2 gap-1.5 bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400 size-4" />
                Up
            </Badge>
        )
    }
    if (status === "Down") {
        return (
            <Badge variant="destructive" className="px-2 gap-1.5">
                <IconCircleCheckFilled className="fill-red-200 size-4" />
                Down
            </Badge>
        )
    }
    if (status === "Warning") {
        return (
            <Badge className="px-2 gap-1.5 bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400">
                <IconLoader className="size-4" />
                Warning
            </Badge>
        )
    }
    return (
        <Badge variant="secondary" className="px-2 gap-1.5">
            <IconLoader className="size-4 animate-spin" />
            {status || "Unknown"}
        </Badge>
    )
}

function buildColumns(handleRowExpand) {
    return [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row, table }) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={() => {
                            const meta = table.options.meta
                            if (meta?.handleRowExpand) {
                                meta.handleRowExpand(row.id, row.original.id)
                            }
                        }}
                        aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
                    >
                        <IconChevronDown
                            className={`size-4 transition-transform duration-200 ${row.getIsExpanded() ? "rotate-180" : ""}`}
                        />
                    </Button>
                    <div className="font-medium">{row.original.name}</div>
                </div>
            ),
            enableHiding: false,
        },
        {
            accessorKey: "url",
            header: "URL",
            cell: ({ row }) => (
                <a
                    href={row.original.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground max-w-md truncate text-sm hover:text-primary flex items-center gap-1 group"
                    title={row.original.url}
                >
                    <span className="truncate">{row.original.url}</span>
                    <IconExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            filterFn: (row, id, value) => {
                if (value === "all") return true
                return row.getValue(id) === value
            },
        },
        {
            accessorKey: "responseTime",
            header: () => <div className="text-right">Response Time</div>,
            cell: ({ row }) => {
                const ms = parseInt(row.original.responseTime) || 0
                const color = ms === 0 ? "text-muted-foreground"
                    : ms < 300 ? "text-green-600 dark:text-green-400"
                        : ms < 700 ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400"
                return (
                    <div className={`text-right font-mono text-sm ${color}`}>
                        {ms > 0 ? `${ms}ms` : "–"}
                    </div>
                )
            },
        },
        {
            accessorKey: "uptime",
            header: () => <div className="text-right">Uptime</div>,
            cell: ({ row }) => {
                const uptime = parseFloat(row.original.uptime) || 0
                const color = uptime >= 99 ? "text-green-600 dark:text-green-400"
                    : uptime >= 95 ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400"
                return (
                    <div className="flex items-center justify-end gap-2">
                        <div className="w-16">
                            <Progress value={uptime} className="h-2" />
                        </div>
                        <span className={`font-mono text-sm w-14 text-right ${color}`}>
                            {uptime > 0 ? `${uptime.toFixed(1)}%` : "–"}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "lastCheck",
            header: "Last Check",
            cell: ({ row }) => (
                <div className="text-muted-foreground text-sm whitespace-nowrap">
                    {row.original.lastCheck || "–"}
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const url = row.original

                const handleOpenURL = () => {
                    window.open(url.url, '_blank', 'noopener,noreferrer')
                }

                const handleCopyURL = () => {
                    navigator.clipboard.writeText(url.url)
                    toast.success("URL copied to clipboard")
                }

                const handleCopyID = () => {
                    navigator.clipboard.writeText(url.id)
                    toast.success("URL ID copied to clipboard")
                }

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                                size="icon"
                            >
                                <IconDotsVertical className="size-4" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={handleOpenURL}>
                                Open URL
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopyURL}>
                                Copy URL
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopyID}>
                                Copy Monitor ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {/* 
                                DISABLED: DELETE / EDIT / PAUSE
                                API Gateway does not have DELETE /urls/{id} or PUT /urls/{id} routes.
                                Enable when routes are added.
                            */}
                            <DropdownMenuItem
                                disabled
                                className="text-muted-foreground cursor-not-allowed text-xs"
                            >
                                Edit & Delete coming soon
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}

export function URLListTable({ data: initialData, onRefresh }) {
    const [data, setData] = React.useState(() => initialData || [])
    const [columnFilters, setColumnFilters] = React.useState([])
    const [sorting, setSorting] = React.useState([])
    const [expanded, setExpanded] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
    const [performanceData, setPerformanceData] = React.useState({})
    const [loadingPerformance, setLoadingPerformance] = React.useState({})

    React.useEffect(() => {
        if (initialData) setData(initialData)
    }, [initialData])

    const handleRowExpand = React.useCallback(async (rowId, urlId) => {
        const isExpanding = !expanded[rowId]

        setExpanded((prev) => ({ ...prev, [rowId]: isExpanding }))

        // Fetch only if expanding and we don't have data yet
        if (isExpanding && !performanceData[urlId] && urlId) {
            setLoadingPerformance((prev) => ({ ...prev, [urlId]: true }))
            const chartData = await fetchPerformanceData(urlId)
            setPerformanceData((prev) => ({ ...prev, [urlId]: chartData }))
            setLoadingPerformance((prev) => ({ ...prev, [urlId]: false }))
        }
    }, [expanded, performanceData])

    const columns = React.useMemo(() => buildColumns(handleRowExpand), [handleRowExpand])

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnFilters, expanded, globalFilter, pagination },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onExpandedChange: setExpanded,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowCanExpand: () => true,
        meta: { handleRowExpand, performanceData, loadingPerformance },
    })

    return (
        <div className="space-y-4">
            {/* Search + Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or URL..."
                        value={globalFilter ?? ""}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-9 pr-9"
                    />
                    {globalFilter && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                            onClick={() => setGlobalFilter("")}
                        >
                            <IconX className="size-4" />
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="status-filter" className="text-sm whitespace-nowrap">Status:</Label>
                    <Select
                        value={table.getColumn("status")?.getFilterValue() ?? "all"}
                        onValueChange={(value) =>
                            table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
                        }
                    >
                        <SelectTrigger id="status-filter" className="w-32">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="Up">Up</SelectItem>
                            <SelectItem value="Down">Down</SelectItem>
                            <SelectItem value="Warning">Warning</SelectItem>
                            <SelectItem value="Unknown">Unknown</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border">
                <Table>
                    <TableHeader className="bg-muted">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} colSpan={header.colSpan}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <React.Fragment key={row.id}>
                                    <TableRow data-state={row.getIsSelected() && "selected"}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {row.getIsExpanded() && (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="bg-muted/30 p-4">
                                                {table.options.meta?.loadingPerformance?.[row.original.id] ? (
                                                    <div className="text-center py-8">
                                                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                                        <p className="text-muted-foreground text-sm mt-2">
                                                            Loading performance data...
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <URLPerformanceChart
                                                        data={table.options.meta?.performanceData?.[row.original.id] || []}
                                                        urlName={row.original.name}
                                                        urlId={row.original.id}
                                                    />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No monitors found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2">
                <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                    Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} URL(s)
                </div>
                <div className="flex w-full items-center gap-8 lg:w-fit">
                    <div className="hidden items-center gap-2 lg:flex">
                        <Label htmlFor="rows-per-page" className="text-sm font-medium">Rows per page</Label>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => table.setPageSize(Number(value))}
                        >
                            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                <SelectValue placeholder={table.getState().pagination.pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 50].map((size) => (
                                    <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-fit items-center justify-center text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </div>
                    <div className="ml-auto flex items-center gap-2 lg:ml-0">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <IconChevronsLeft className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="size-8"
                            size="icon"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <IconChevronLeft className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="size-8"
                            size="icon"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <IconChevronRight className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden size-8 lg:flex"
                            size="icon"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <IconChevronsRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
