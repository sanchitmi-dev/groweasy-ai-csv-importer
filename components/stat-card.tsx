import { clsx } from "clsx";

type StatCardProps = {
  label: string;
  value: number;
  tone?: "good" | "warn" | "neutral";
};

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/8">
      <p className="text-xs font-bold uppercase tracking-normal text-ink/56 dark:text-white/56">{label}</p>
      <p
        className={clsx(
          "mt-1 text-3xl font-black",
          tone === "good" && "text-mint",
          tone === "warn" && "text-coral",
          tone === "neutral" && "text-ink dark:text-white"
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
