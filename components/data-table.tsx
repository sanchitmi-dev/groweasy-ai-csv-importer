import { clsx } from "clsx";

type Row = Record<string, unknown>;

type DataTableProps = {
  title: string;
  subtitle: string;
  headers: string[];
  rows: Row[];
  compact?: boolean;
};

export function DataTable({ title, subtitle, headers, rows, compact = false }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white/82 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-black/10 px-4 py-3 dark:border-white/10">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-ink/62 dark:text-white/62">{subtitle}</p>
        </div>
        <span className="rounded-md bg-mint/12 px-2.5 py-1 text-xs font-bold uppercase tracking-normal text-mint">
          {rows.length} rows
        </span>
      </div>
      <div className={clsx("table-scroll max-h-[560px] overflow-auto", compact && "max-h-72")}>
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="sticky top-0 z-10 whitespace-nowrap border-b border-black/10 bg-[#f3faf6] px-3 py-3 text-xs font-black uppercase tracking-normal text-ink dark:border-white/10 dark:bg-[#182522] dark:text-white"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="odd:bg-black/[0.018] hover:bg-mint/8 dark:odd:bg-white/[0.035]">
                  {headers.map((header) => (
                    <td
                      key={`${rowIndex}-${header}`}
                      className="max-w-[320px] whitespace-nowrap border-b border-black/5 px-3 py-2.5 text-ink/82 dark:border-white/7 dark:text-white/82"
                      title={String(row[header] ?? "")}
                    >
                      <span className="block overflow-hidden text-ellipsis">{String(row[header] ?? "")}</span>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-ink/58 dark:text-white/58" colSpan={Math.max(headers.length, 1)}>
                  No rows to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
