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

// Fetch performance data from API
async function fetchPerformanceData(urlId) {
    try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE
        const response = await fetch(`${apiBase}/logs?urlId=${urlId}&limit=24`)

        if (!response.ok) {
            console.warn("Performance data not available")
            return []
        }

        const result = await response.json()
        let logs = []

        if (Array.isArray(result)) {
            logs = result
        } else if (result && typeof result === 'object') {
            logs = result.data || result.logs || []
        }

        // Transform logs to chart data format
        return logs
            .filter(log => log.responseTime && log.timestamp)
            .map(log => ({
                timestamp: new Date(log.timestamp).getTime(),
                responseTime: parseInt(log.responseTime) || 0,
            }))
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-24) // Last 24 data points
    } catch (error) {
        console.error("Error fetching performance data:", error)
        return []
    }
}

const columns = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row, table }) => (
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => {
                        const handleExpand = table.options.meta?.handleRowExpand
                        if (handleExpand) {
                            handleExpand(row.id, row.original.id)
                        }
                    }}
                >
                    <IconChevronDown
                        className={`size-4 transition-transform ${row.getIsExpanded() ? "rotate-180" : ""
                            }`}
                    />
                </Button>
                <div className="font-medium">{row.original.name || "Unnamed"}</div>
            </div>
        ),
        enableHiding: false,
    },
    {
        accessorKey: "url",
        header: "URL",
        cell: ({ row }) => (
            <div className="text-muted-foreground max-w-md truncate text-sm" title={row.original.url}>
                {row.original.url}
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.status
            const variant = status === "Up" ? "default" : status === "Down" ? "destructive" : "secondary"
            const icon = status === "Up"
                ? <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400 size-4" />
                : status === "Down"
                    ? <IconCircleCheckFilled className="fill-red-500 dark:fill-red-400 size-4" />
                    : <IconLoader className="size-4" />

            return (
                <Badge variant={variant} className="px-2 gap-1.5">
                    {icon}
                    {status}
                </Badge>
            )
        },
        filterFn: (row, id, value) => {
            if (value === "all") return true
            return row.getValue(id) === value
        },
    },
    {
        accessorKey: "responseTime",
        header: () => <div className="text-right">Response Time</div>,
        cell: ({ row }) => (
            <div className="text-right font-mono text-sm">
                {row.original.responseTime ? `${row.original.responseTime}ms` : "-"}
            </div>
        ),
    },
    {
        accessorKey: "uptime",
        header: () => <div className="text-right">Uptime</div>,
        cell: ({ row }) => {
            const uptime = parseFloat(row.original.uptime) || 0
            return (
                <div className="flex items-center justify-end gap-2">
                    <div className="w-16">
                        <Progress value={uptime} className="h-2" />
                    </div>
                    <span className="font-mono text-sm w-12 text-right">
                        {uptime.toFixed(1)}%
                    </span>
                </div>
            )
        },
    },
    {
        accessorKey: "lastCheck",
        header: "Last Check",
        cell: ({ row }) => (
            <div className="text-muted-foreground text-sm">
                {row.original.lastCheck}
            </div>
        ),
    },
    {
        accessorKey: "region",
        header: "Region",
        cell: ({ row }) => (
            <Badge variant="outline" className="text-muted-foreground px-2">
                {row.original.region}
            </Badge>
        ),
        filterFn: (row, id, value) => {
            if (value === "all") return true
            return row.getValue(id) === value
        },
    },
    {
        id: "actions",
        cell: () => (
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
                <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Pause</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ),
    },
]

export function URLListTable({ data: initialData }) {
    const [data, setData] = React.useState(() => initialData)
    const [columnFilters, setColumnFilters] = React.useState([])
    const [sorting, setSorting] = React.useState([])
    const [expanded, setExpanded] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    })
    const [performanceData, setPerformanceData] = React.useState({})
    const [loadingPerformance, setLoadingPerformance] = React.useState({})

    // Sync with parent data updates
    React.useEffect(() => {
        if (initialData) {
            setData(initialData)
        }
    }, [initialData])

    // Fetch performance data when row is expanded
    const handleRowExpand = React.useCallback(async (rowId, urlId) => {
        const isExpanding = !expanded[rowId]

        // Toggle expansion
        setExpanded(prev => ({
            ...prev,
            [rowId]: isExpanding
        }))

        // Fetch performance data if expanding and not already loaded
        if (isExpanding && !performanceData[urlId]) {
            setLoadingPerformance(prev => ({ ...prev, [urlId]: true }))
            const data = await fetchPerformanceData(urlId)
            setPerformanceData(prev => ({ ...prev, [urlId]: data }))
            setLoadingPerformance(prev => ({ ...prev, [urlId]: false }))
        }
    }, [expanded, performanceData])

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            expanded,
            globalFilter,
            pagination,
        },
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
        meta: {
            handleRowExpand,
            performanceData,
            loadingPerformance,
        },
    })

    // Get unique regions for filter
    const uniqueRegions = React.useMemo(() => {
        const regions = new Set(data.map(item => item.region).filter(Boolean))
        return Array.from(regions)
    }, [data])

    return (
        <div className="space-y-4">
            {/* Filters and Search */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search URLs..."
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
                    <Label htmlFor="status-filter" className="text-sm whitespace-nowrap">
                        Status:
                    </Label>
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
                        </SelectContent>
                    </Select>

                    {uniqueRegions.length > 1 && (
                        <>
                            <Label htmlFor="region-filter" className="text-sm whitespace-nowrap ml-2">
                                Region:
                            </Label>
                            <Select
                                value={table.getColumn("region")?.getFilterValue() ?? "all"}
                                onValueChange={(value) =>
                                    table.getColumn("region")?.setFilterValue(value === "all" ? undefined : value)
                                }
                            >
                                <SelectTrigger id="region-filter" className="w-32">
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    {uniqueRegions.map((region) => (
                                        <SelectItem key={region} value={region}>
                                            {region}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </>
                    )}
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
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
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
                                            <TableCell colSpan={columns.length} className="bg-muted/50 p-4">
                                                {table.options.meta?.loadingPerformance?.[row.original.id] ? (
                                                    <div className="text-center py-8">
                                                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                                        <p className="text-muted-foreground text-sm mt-2">Loading performance data...</p>
                                                    </div>
                                                ) : (
                                                    <URLPerformanceChart
                                                        data={table.options.meta?.performanceData?.[row.original.id] || []}
                                                        urlName={row.original.name}
                                                    />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2">
                <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                    Showing {table.getRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} URL(s)
                </div>
                <div className="flex w-full items-center gap-8 lg:w-fit">
                    <div className="hidden items-center gap-2 lg:flex">
                        <Label htmlFor="rows-per-page" className="text-sm font-medium">
                            Rows per page
                        </Label>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value))
                            }}
                        >
                            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                <SelectValue
                                    placeholder={table.getState().pagination.pageSize}
                                />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-fit items-center justify-center text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                    </div>
                    <div className="ml-auto flex items-center gap-2 lg:ml-0">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to first page</span>
                            <IconChevronsLeft className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="size-8"
                            size="icon"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <IconChevronLeft className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="size-8"
                            size="icon"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>
                            <IconChevronRight className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden size-8 lg:flex"
                            size="icon"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to last page</span>
                            <IconChevronsRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
