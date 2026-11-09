import {
	type ColumnDef,
	columnSizingFeature,
	createSortedRowModel,
	flexRender,
	rowSortingFeature,
	sortFn_alphanumeric,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import type { RowData } from "@tanstack/table-core";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dataTableFeatures = tableFeatures({
	columnSizingFeature,
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: { alphanumeric: sortFn_alphanumeric },
});

interface DataTableProps<TData extends RowData> {
	columns: ColumnDef<typeof dataTableFeatures, TData>[];
	data: TData[];
	caption?: string;
	loading?: boolean;
	emptyMessage?: string;
	getRowId?: (row: TData) => string;
	fill?: boolean;
	activeRowId?: string;
}

function DataTable<TData extends RowData>({
	columns,
	data,
	caption = "Results",
	loading = false,
	emptyMessage = "No results found.",
	getRowId,
	fill = false,
	activeRowId,
}: DataTableProps<TData>) {
	const table = useTable({
		features: dataTableFeatures,
		data,
		columns,
		getRowId,
		sortDescFirst: false,
		defaultColumn: { sortFn: "alphanumeric" },
	});

	return (
		<div
			className={cn(
				"min-w-0 overflow-hidden rounded-xl border border-border bg-card",
				fill && "min-h-0 flex-1",
			)}
			aria-busy={loading}
		>
			<Table
				containerClassName={
					fill
						? "h-full overscroll-contain focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring"
						: undefined
				}
				scrollLabel={fill ? caption : undefined}
				style={{ minWidth: table.getTotalSize(), tableLayout: "fixed" }}
			>
				<caption className="sr-only">{caption}</caption>
				<TableHeader className={fill ? "sticky top-0 z-10 bg-card" : undefined}>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									style={{ width: header.getSize() }}
									aria-sort={
										header.column.getIsSorted() === "asc"
											? "ascending"
											: header.column.getIsSorted() === "desc"
												? "descending"
												: undefined
									}
								>
									{header.isPlaceholder ? null : header.column.getCanSort() ? (
										<Button
											variant="ghost"
											size="sm"
											className="-ml-2 gap-2 text-xs font-medium"
											onClick={header.column.getToggleSortingHandler()}
										>
											{flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
											{header.column.getIsSorted() === "asc" ? (
												<ArrowUp aria-hidden="true" />
											) : header.column.getIsSorted() === "desc" ? (
												<ArrowDown aria-hidden="true" />
											) : (
												<ArrowUpDown
													className="opacity-60"
													aria-hidden="true"
												/>
											)}
										</Button>
									) : (
										flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)
									)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{loading ? (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-40 text-center">
								<span
									className="inline-flex items-center gap-2 text-muted-foreground"
									role="status"
								>
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
									Loading results…
								</span>
							</TableCell>
						</TableRow>
					) : table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-active={row.id === activeRowId || undefined}
								className={
									row.id === activeRowId
										? "bg-primary/5 hover:bg-primary/10"
										: undefined
								}
							>
								{row.getAllCells().map((cell) => (
									<TableCell
										key={cell.id}
										style={{ width: cell.column.getSize() }}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center text-muted-foreground"
							>
								{emptyMessage}
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

export { DataTable };
