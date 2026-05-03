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
    IconAlertTriangle,
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
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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

// Per-row context so DragHandle can receive attrs/listeners without
// the column cell needing to read them from the mutated row.original.
const DragHandleContext = React.createContext(null)

// ─── Drag Handle ──────────────────────────────────────────────────────────────
// Reads attributes & listeners from the nearest DragHandleContext provided
// by DraggableRow — no state mutation required.
function DragHandle() {
    const ctx = React.useContext(DragHandleContext)
    return (
        <Button
            {...ctx?.attributes}
            {...ctx?.listeners}
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-7 hover:bg-transparent cursor-grab active:cursor-grabbing"
        >
            <IconGripVertical className="text-muted-foreground size-3" />
            <span className="sr-only">Drag to reorder</span>
        </Button>
    )
}

// In url-table.jsx, replace the StatusBadge function with this version
// to handle the new "Checking" status that use-url-data now sets on optimistic rows.

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
                <IconAlertTriangle className="size-3" />
                Warning
            </Badge>
        )
    }
    // NEW: "Checking" status for freshly-added optimistic rows
    if (status === "Checking") {
        return (
            <Badge variant="secondary" className="px-1.5 gap-1 animate-pulse">
                <IconLoader className="size-3 animate-spin" />
                Checking…
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

// Also update the status column cell in buildColumns to handle "Checking":
//
//   cell: ({ row }) => {
//       if (row.original.enabled === false) {
//           return (
//               <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
//                   Paused
//               </span>
//           )
//       }
//       return <StatusBadge status={row.original.status} />
//   },
//
// No change needed there — StatusBadge now handles "Checking" itself.

function buildColumns(onRefresh) {
    return [
        {
            id: "drag",
            header: () => null,
            // DragHandle reads attributes/listeners from DragHandleContext
            // provided by DraggableRow — no state mutation on row.original.
            cell: () => <DragHandle />,
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
            cell: ({ row }) => {
                const disabled = row.original.enabled === false
                return (
                    <div className={`font-medium ${disabled ? "line-through text-muted-foreground" : ""}`}>
                        {row.original.name}
                    </div>
                )
            },
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
            cell: ({ row }) => {
                if (row.original.enabled === false) {
                    return (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Paused
                        </span>
                    )
                }
                return <StatusBadge status={row.original.status} />
            },
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

// ─── Delete Confirmation Dialog ────────────────────────────────────────────────
function DeleteConfirmDialog({ open, onOpenChange, urlName, onConfirm, isDeleting }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Delete Monitor</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{urlName}&quot;</span> from monitoring? This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive-foreground" />
                                Deleting...
                            </span>
                        ) : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function RowActions({ row, onRefresh }) {
    const url = row.original
    const router = useRouter()
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

    const handleViewDetails = () => {
        // Navigate to the URLs list; a dedicated detail page can be added later
        router.push(`/dashboard/urls?highlight=${encodeURIComponent(url.id)}`)
    }

    const handleOpenURL = () => {
        window.open(url.url, '_blank', 'noopener,noreferrer')
    }

    const handleCopyURL = () => {
        navigator.clipboard.writeText(url.url)
        toast.success("URL copied to clipboard")
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const urlId = url.id || url.URLid
            const res = await apiClient.delete(`/urls/${urlId}`)
            if (!res.ok) {
                const body = await res.text().catch(() => '')
                throw new Error(`Server returned ${res.status}: ${body}`)
            }
            toast.success(`"${url.name}" deleted from monitoring`)
            setDeleteDialogOpen(false)
            if (onRefresh) onRefresh()
        } catch (err) {
            console.error('[delete]', err)
            if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                toast.error(
                    'Delete failed: The API does not support DELETE requests yet. ' +
                    'Enable DELETE method for /urls/{id} in AWS API Gateway and redeploy.',
                    { duration: 8000 }
                )
            } else {
                toast.error(`Failed to delete: ${err.message || 'Unknown error'}`)
            }
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                        size="icon"
                        disabled={isDeleting}
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
                    <DropdownMenuItem
                        disabled
                        className="text-muted-foreground cursor-not-allowed"
                        title="Edit not yet available"
                    >
                        Edit (coming soon)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                urlName={url.name}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />
        </>
    )
}

// ─── Draggable Row ─────────────────────────────────────────────────────────────
// Single useSortable registration per row. Provides attributes & listeners via
// DragHandleContext so DragHandle never needs to call useSortable itself and
// we never mutate objects that live inside React state.
function DraggableRow({ row }) {
    const { transform, transition, setNodeRef, isDragging, attributes, listeners } = useSortable({
        id: row.original.id,
    })

    const isPaused = row.original.enabled === false

    return (
        <DragHandleContext.Provider value={{ attributes, listeners }}>
            <TableRow
                data-state={row.getIsSelected() && "selected"}
                data-dragging={isDragging ? "true" : "false"}
                ref={setNodeRef}
                className={`relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 transition-opacity ${isPaused ? "opacity-50" : ""}`}
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
        </DragHandleContext.Provider>
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
                            .map((col) => {
                                const headerDef = col.columnDef.header
                                const label = typeof headerDef === "string"
                                    ? headerDef
                                    : { url: "URL", status: "Status", responseTime: "Response Time", uptime: "Uptime", lastCheck: "Last Check" }[col.id] || col.id
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={col.id}
                                        className="capitalize"
                                        checked={col.getIsVisible()}
                                        onCheckedChange={(value) => col.toggleVisibility(!!value)}
                                    >
                                        {label}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
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
