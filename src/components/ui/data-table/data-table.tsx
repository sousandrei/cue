import {
	type ColumnDef,
	columnSizingFeature,
	flexRender,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import type { RowData } from "@tanstack/table-core";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const features = tableFeatures({ columnSizingFeature });

interface DataTableProps<TData extends RowData> {
	columns: ColumnDef<typeof features, TData>[];
	data: TData[];
}

function DataTable<TData extends RowData>({
	columns,
	data,
}: DataTableProps<TData>) {
	const table = useTable({
		features,
		data,
		columns,
	});

	return (
		<div className="rounded-lg border border-glass-border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getAllCells().map((cell) => (
									<TableCell key={cell.id}>
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
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

export { DataTable };
