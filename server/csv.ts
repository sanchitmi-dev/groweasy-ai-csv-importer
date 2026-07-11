import { parse } from "csv-parse/sync";
import type { PreviewRow } from "./types.js";

export function parseCsv(buffer: Buffer): PreviewRow[] {
  const csv = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  }) as PreviewRow[];

  if (!rows.length) {
    throw new Error("The CSV needs at least one data row.");
  }

  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), String(value ?? "").trim()]))
  );
}
