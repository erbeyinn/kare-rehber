import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[]
  data: T[]
  empty?: string
}

export function DataTable<T>({ columns, data, empty = 'Kayıt yok.' }: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-stone-200/70 bg-stone-50/70 text-left"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-5 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-10 text-center text-sm text-stone-400"
              >
                {empty}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-stone-100 last:border-0 transition-colors hover:bg-stone-50/60"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-3 align-middle text-stone-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
