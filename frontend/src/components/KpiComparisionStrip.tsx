import { useMemo, useState } from "react";
import { Clock3, GitMerge, TrendingUp } from "lucide-react";

export type Metrics = {
  possession_hours: number;
  backlog_cleared_pct: number;
  corridor_uptime_pct: number;
};

type KpiComparisonStripProps = {
  optimizedMetrics: Metrics;
  baselineMetrics: Metrics;
};

function percentageChange(current: number, baseline: number): number {
  if (baseline === 0) {
    return 0;
  }
  return ((current - baseline) / baseline) * 100;
}

export default function KpiComparisonStrip({
  optimizedMetrics,
  baselineMetrics,
}: KpiComparisonStripProps) {
  const [isComparing, setIsComparing] = useState(false);

  const metrics = useMemo(
    () => [
      {
        key: "possession",
        label: "Total Possession Hours",
        icon: Clock3,
        optimized: optimizedMetrics.possession_hours,
        baseline: baselineMetrics.possession_hours,
        format: (value: number) => `${value.toFixed(1)}h`,
        badge: () => {
          const reduction = Math.abs(
            percentageChange(
              optimizedMetrics.possession_hours,
              baselineMetrics.possession_hours,
            ),
          );
          return `-${reduction.toFixed(0)}% Downtime`;
        },
      },
      {
        key: "backlog",
        label: "Overdue Backlog Cleared",
        icon: TrendingUp,
        optimized: optimizedMetrics.backlog_cleared_pct,
        baseline: baselineMetrics.backlog_cleared_pct,
        format: (value: number) => `${value.toFixed(1)}%`,
        badge: () =>
          `+${(
            optimizedMetrics.backlog_cleared_pct -
            baselineMetrics.backlog_cleared_pct
          ).toFixed(1)}%`,
      },
      {
        key: "uptime",
        label: "Corridor Uptime",
        icon: GitMerge,
        optimized: optimizedMetrics.corridor_uptime_pct,
        baseline: baselineMetrics.corridor_uptime_pct,
        format: (value: number) => `${value.toFixed(1)}%`,
        badge: () =>
          `+${(
            optimizedMetrics.corridor_uptime_pct -
            baselineMetrics.corridor_uptime_pct
          ).toFixed(1)}%`,
      },
    ],
    [baselineMetrics, optimizedMetrics],
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Corridor Performance
          </p>
          <p className="text-xs text-slate-500">
            AI-optimized maintenance plan impact
          </p>
        </div>
        <button
          type="button"
          aria-pressed={isComparing}
          onClick={() => setIsComparing((value) => !value)}
          className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-300 cursor-pointer ${
            isComparing
              ? "bg-blue-600 text-white shadow-sm"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {isComparing
            ? "Hide Legacy Comparison"
            : "Compare with Legacy Decentralized Plan"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.key}
              className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            >
              <div className="flex items-center gap-2 px-4 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {metric.label}
                </p>
              </div>

              <div className="relative px-4 pb-4 pt-3">
                <div
                  className={`transition-all duration-300 ${
                    isComparing
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none absolute translate-y-2 opacity-0"
                  }`}
                >
                  {isComparing && (
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-xl font-bold text-slate-900">
                          {metric.format(metric.optimized)}
                          <span className="mx-1.5 text-sm font-medium text-slate-400">
                            vs
                          </span>
                          <span className="text-base font-semibold text-slate-500">
                            {metric.format(metric.baseline)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Optimized plan vs legacy plan
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                        {metric.badge()}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  className={`transition-all duration-300 ${
                    isComparing
                      ? "pointer-events-none absolute translate-y-2 opacity-0"
                      : "translate-y-0 opacity-100"
                  }`}
                >
                  {!isComparing && (
                    <>
                      <p className="text-2xl font-bold text-slate-900">
                        {metric.format(metric.optimized)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Optimized plan
                      </p>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}