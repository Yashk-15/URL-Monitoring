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

// Generate mock performance data for demonstration
// In production, this would come from the API
function generateMockPerformanceData(baseResponseTime) {
    const data = []
    const now = Date.now()
    for (let i = 23; i >= 0; i--) {
        const timestamp = now - (i * 60 * 60 * 1000) // hourly data for 24 hours
        const variation = Math.random() * 100 - 50 // ±50ms variation
        data.push({
            timestamp,
            responseTime: Math.max(50, baseResponseTime + variation),
        })
    }
    return data
}

const columns = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => row.toggleExpanded()}
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

    // Sync with parent data updates
    React.useEffect(() => {
        if (initialData) {
            setData(initialData)
        }
    }, [initialData])

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
                                                <URLPerformanceChart
                                                    data={generateMockPerformanceData(
                                                        parseInt(row.original.responseTime) || 200
                                                    )}
                                                    urlName={row.original.name}
                                                />
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
