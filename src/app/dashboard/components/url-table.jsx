"use client"

import * as React from "react"
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircleCheckFilled,
    IconDotsVertical,
    IconGripVertical,
    IconLayoutColumns,
    IconLoader,
    IconExternalLink,
} from "@tabler/icons-react"
import {
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
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

// Drag handle
function DragHandle({ id }) {
    const { attributes, listeners } = useSortable({ id })
    return (
        <Button
            {...attributes}
            {...listeners}
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-7 hover:bg-transparent cursor-grab active:cursor-grabbing"
        >
            <IconGripVertical className="text-muted-foreground size-3" />
            <span className="sr-only">Drag to reorder</span>
        </Button>
    )
}

function StatusBadge({ status }) {
    if (status === "Up") {
        return (
            <Badge className="px-1.5 gap-1 bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400 size-3" />
                Up
            </Badge>
        )
    }
    if (status === "Down") {
        return (
            <Badge variant="destructive" className="px-1.5 gap-1">
                <IconCircleCheckFilled className="fill-red-200 size-3" />
                Down
            </Badge>
        )
    }
    if (status === "Warning") {
        return (
            <Badge className="px-1.5 gap-1 bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400">
                <IconLoader className="size-3" />
                Warning
            </Badge>
        )
    }
    return (
        <Badge variant="secondary" className="px-1.5 gap-1">
            <IconLoader className="size-3 animate-spin" />
            {status || "Unknown"}
        </Badge>
    )
}

function buildColumns(onRefresh) {
    return [
        {
            id: "drag",
            header: () => null,
            cell: ({ row }) => <DragHandle id={row.original.id} />,
        },
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <div className="font-medium">{row.original.name}</div>
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
                    className="text-muted-foreground max-w-xs truncate text-sm hover:text-primary flex items-center gap-1 group"
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
        },
        {
            accessorKey: "responseTime",
            header: () => <div className="w-full text-right">Response Time</div>,
            cell: ({ row }) => {
                const ms = parseInt(row.original.responseTime) || 0
                const color = ms < 300
                    ? "text-green-600 dark:text-green-400"
                    : ms < 700
                        ? "text-yellow-600 dark:text-yellow-400"
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
            header: () => <div className="w-full text-right">Uptime</div>,
            cell: ({ row }) => {
                const uptime = parseFloat(row.original.uptime) || 0
                const color = uptime >= 99 ? "text-green-600 dark:text-green-400"
                    : uptime >= 95 ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400"
                return (
                    <div className={`text-right font-mono text-sm ${color}`}>
                        {uptime > 0 ? `${uptime.toFixed(1)}%` : "–"}
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
            cell: ({ row }) => (
                <RowActions row={row} onRefresh={onRefresh} />
            ),
        },
    ]
}

function RowActions({ row, onRefresh }) {
    const url = row.original

    const handleViewDetails = () => {
        // Navigate to the URLs page and expand this item
        window.location.href = `/dashboard/urls`
    }

    const handleOpenURL = () => {
        window.open(url.url, '_blank', 'noopener,noreferrer')
    }

    const handleCopyURL = () => {
        navigator.clipboard.writeText(url.url)
        toast.success("URL copied to clipboard")
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
                <DropdownMenuItem onClick={handleViewDetails}>
                    View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenURL}>
                    Open URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyURL}>
                    Copy URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* 
                    DELETE / EDIT / PAUSE: Disabled — backend routes 
                    DELETE /urls/{id} and PUT /urls/{id} do not exist yet.
                    Enable these once the routes are added to API Gateway.
                */}
                <DropdownMenuItem
                    disabled
                    className="text-muted-foreground cursor-not-allowed"
                    title="Edit not yet available"
                >
                    Edit (coming soon)
                </DropdownMenuItem>
                <DropdownMenuItem
                    disabled
                    variant="destructive"
                    className="cursor-not-allowed opacity-50"
                    title="Delete not yet available"
                >
                    Delete (coming soon)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function DraggableRow({ row }) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({
        id: row.original.id,
    })

    return (
        <TableRow
            data-state={row.getIsSelected() && "selected"}
            data-dragging={isDragging}
            ref={setNodeRef}
            className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
        >
            {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    )
}

export function DataTable({ data: initialData, onRefresh }) {
    const [data, setData] = React.useState(() => initialData || [])
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState({})
    const [columnFilters, setColumnFilters] = React.useState([])
    const [sorting, setSorting] = React.useState([])
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
    const sortableId = React.useId()

    const sensors = useSensors(
        useSensor(MouseSensor, {}),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    )

    // Sync with parent data changes
    React.useEffect(() => {
        if (initialData) setData(initialData)
    }, [initialData])

    const columns = React.useMemo(() => buildColumns(onRefresh), [onRefresh])

    const dataIds = React.useMemo(
        () => data?.map(({ id }) => id) || [],
        [data]
    )

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
        getRowId: (row, index) => row?.id?.toString() || index.toString(),
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })

    function handleDragEnd(event) {
        const { active, over } = event
        if (active && over && active.id !== over.id) {
            setData((current) => {
                const oldIndex = dataIds.indexOf(active.id)
                const newIndex = dataIds.indexOf(over.id)
                return arrayMove(current, oldIndex, newIndex)
            })
        }
    }

    const selectedCount = table.getFilteredSelectedRowModel().rows.length
    const totalCount = table.getFilteredRowModel().rows.length

    return (
        <div className="w-full flex-col justify-start gap-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 lg:px-6 mb-4">
                <div className="text-sm text-muted-foreground">
                    {selectedCount > 0
                        ? `${selectedCount} of ${totalCount} row(s) selected`
                        : `${totalCount} monitor(s)`}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <IconLayoutColumns />
                            <span className="hidden lg:inline">Columns</span>
                            <IconChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {table
                            .getAllColumns()
                            .filter((col) => typeof col.accessorFn !== "undefined" && col.getCanHide())
                            .map((col) => (
                                <DropdownMenuCheckboxItem
                                    key={col.id}
                                    className="capitalize"
                                    checked={col.getIsVisible()}
                                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                                >
                                    {col.id}
                                </DropdownMenuCheckboxItem>
                            ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Table */}
            <div className="px-4 lg:px-6">
                <div className="overflow-hidden rounded-lg border">
                    <DndContext
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleDragEnd}
                        sensors={sensors}
                        id={sortableId}
                    >
                        <Table>
                            <TableHeader className="bg-muted sticky top-0 z-10">
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
                            <TableBody className="**:data-[slot=table-cell]:first:w-8">
                                {table.getRowModel().rows?.length ? (
                                    <SortableContext
                                        items={dataIds}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {table.getRowModel().rows.map((row) => (
                                            <DraggableRow key={row.id} row={row} />
                                        ))}
                                    </SortableContext>
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            No monitors found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 lg:px-6 mt-4">
                <div className="hidden lg:flex text-muted-foreground flex-1 text-sm">
                    {selectedCount} of {totalCount} row(s) selected.
                </div>
                <div className="flex w-full items-center gap-8 lg:w-fit">
                    <div className="hidden items-center gap-2 lg:flex">
                        <Label htmlFor="rows-per-page" className="text-sm font-medium">
                            Rows per page
                        </Label>
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
                            <span className="sr-only">First page</span>
                            <IconChevronsLeft />
                        </Button>
                        <Button
                            variant="outline"
                            className="size-8"
                            size="icon"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Previous page</span>
                            <IconChevronLeft />
                        </Button>
                        <Button
                            variant="outline"
                            className="size-8"
                            size="icon"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Next page</span>
                            <IconChevronRight />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden size-8 lg:flex"
                            size="icon"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Last page</span>
                            <IconChevronsRight />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

