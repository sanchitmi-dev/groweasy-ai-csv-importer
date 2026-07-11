"use client";

import Papa from "papaparse";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Moon,
  RefreshCw,
  Send,
  Sun,
  UploadCloud
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ImportResponse, PreviewRow } from "@/server/types";

type Stage = "idle" | "preview" | "processing" | "done";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDark, setIsDark] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const previewRows = useMemo(() => rows.slice(0, 100), [rows]);

  function applyTheme(next: boolean) {
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  function reset() {
    setStage("idle");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setResult(null);
    setError("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function parseFile(nextFile: File) {
    setError("");
    setResult(null);
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a valid CSV file.");
      return;
    }

    Papa.parse<PreviewRow>(nextFile, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header) => header.trim(),
      complete: ({ data, meta, errors }) => {
        if (errors.length) {
          setError(errors[0]?.message || "Unable to parse this CSV.");
          return;
        }
        const cleanHeaders = (meta.fields || []).filter(Boolean);
        if (!cleanHeaders.length || !data.length) {
          setError("The CSV needs at least one header and one data row.");
          return;
        }
        setFile(nextFile);
        setHeaders(cleanHeaders);
        setRows(data);
        setStage("preview");
      },
      error: (err) => setError(err.message)
    });
  }

  async function confirmImport() {
    if (!file) return;
    setStage("processing");
    setError("");
    setProgress(14);
    const tick = window.setInterval(() => {
      setProgress((value) => Math.min(value + 11, 88));
    }, 550);

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/import", { method: "POST", body: form });
      const json = (await response.json()) as ImportResponse | { error: string };
      if (!response.ok) throw new Error("error" in json ? json.error : "Import failed.");
      setResult(json as ImportResponse);
      setProgress(100);
      setStage("done");
    } catch (err) {
      setStage("preview");
      setError(err instanceof Error ? err.message : "Something went wrong during import.");
    } finally {
      window.clearInterval(tick);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white/72 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-mint text-white shadow-glow">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-normal sm:text-2xl">GrowEasy AI CSV Importer</h1>
              <p className="text-sm text-ink/65 dark:text-white/64">Map messy lead exports into CRM-ready records.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle
              isDark={isDark}
              onToggle={() => applyTheme(!isDark)}
              icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
            />
            <button
              onClick={reset}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-ink transition hover:border-mint hover:text-mint dark:border-white/12 dark:bg-white/8 dark:text-white"
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) parseFile(dropped);
              }}
              className="rounded-lg border border-dashed border-mint/70 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:border-mint hover:shadow-glow dark:bg-white/8"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) parseFile(selected);
                }}
              />
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-md bg-mint/12 text-mint">
                  <UploadCloud size={34} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Upload CSV</h2>
                  <p className="mt-1 text-sm leading-6 text-ink/66 dark:text-white/64">
                    Drag and drop a Facebook, Google Ads, CRM, sales, agency, or manual lead export.
                  </p>
                </div>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 font-semibold text-white transition hover:bg-mint dark:bg-mint dark:hover:bg-coral"
                >
                  <UploadCloud size={18} />
                  Choose CSV
                </button>
                {file ? (
                  <p className="w-full truncate rounded-md bg-mint/10 px-3 py-2 text-sm font-medium text-ink dark:text-white">
                    {file.name}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Rows detected" value={rows.length} />
              <StatCard label="Columns" value={headers.length} />
              <StatCard label="Imported" value={result?.totalImported ?? 0} tone="good" />
              <StatCard label="Skipped" value={result?.totalSkipped ?? 0} tone="warn" />
            </div>

            {stage === "preview" ? (
              <button
                onClick={confirmImport}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-coral px-5 font-bold text-white shadow-sm transition hover:brightness-95"
              >
                <Send size={18} />
                Confirm Import
              </button>
            ) : null}

            {stage === "processing" ? (
              <div className="rounded-lg border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/8">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Loader2 className="animate-spin text-mint" size={18} />
                  Processing AI batches
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="flex gap-2 rounded-lg border border-coral/30 bg-coral/10 p-3 text-sm text-coral">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : null}
          </aside>

          <section className="min-w-0 space-y-5">
            <AnimatePresence mode="wait">
              {stage === "idle" ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="grid min-h-[480px] place-items-center rounded-lg border border-black/10 bg-white/64 p-8 text-center dark:border-white/10 dark:bg-white/8"
                >
                  <div className="max-w-xl">
                    <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-md bg-gold/18 text-gold">
                      <FileSpreadsheet size={42} />
                    </div>
                    <h2 className="text-3xl font-black tracking-normal">Ready for any lead CSV</h2>
                    <p className="mt-3 text-ink/66 dark:text-white/64">
                      Upload first. Preview second. AI extraction only starts after confirmation.
                    </p>
                  </div>
                </motion.div>
              ) : null}

              {stage === "preview" || stage === "processing" ? (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <DataTable title="CSV Preview" subtitle={`Showing ${previewRows.length} of ${rows.length} rows`} headers={headers} rows={previewRows} />
                </motion.div>
              ) : null}

              {stage === "done" && result ? (
                <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="flex items-center gap-2 rounded-lg border border-mint/30 bg-mint/10 p-4 text-sm font-semibold text-mint">
                    <CheckCircle2 size={20} />
                    Import complete using {result.provider}.
                  </div>
                  <DataTable title="Parsed CRM Records" subtitle={`${result.totalImported} records ready for GrowEasy CRM`} headers={result.crmFields} rows={result.records} />
                  <DataTable title="Skipped Records" subtitle={`${result.totalSkipped} rows skipped because no email or mobile was found`} headers={["rowNumber", "reason"]} rows={result.skipped} compact />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </div>
      </section>
    </main>
  );
}
