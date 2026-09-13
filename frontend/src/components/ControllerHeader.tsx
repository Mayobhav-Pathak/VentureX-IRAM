import { AlertTriangle, Clock3, GitMerge, TrendingUp } from "lucide-react";

export type Horizon = "weekly" | "monthly";

export type ControllerStats = {
  totalPossessionHours: number;
  overdueClearedPercent: number;
  corridorUptimePercent: number;
  activeConflictsCount: number;
};

type ControllerHeaderProps = {
  horizon: Horizon;
  onHorizonChange: (horizon: Horizon) => void;
  stats: ControllerStats;
};

export default function ControllerHeader({
  horizon,
  onHorizonChange,
  stats,
}: ControllerHeaderProps) {
  const metrics = [
    {
      label: "Total Possession Hours",
      value: `${stats.totalPossessionHours.toFixed(1)}h`,
      icon: Clock3,
      iconClass: "bg-blue-100 text-blue-700",
    },
    {
      label: "Overdue Backlog Cleared",
      value: `${stats.overdueClearedPercent.toFixed(1)}%`,
      icon: TrendingUp,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Corridor Uptime Target",
      value: `${stats.corridorUptimePercent.toFixed(1)}%`,
      icon: GitMerge,
      iconClass: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <header className="space-y-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-blue-700">
            Delhi–Agra Saturated Corridor
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Maintenance Possession Controller
          </h1>
        </div>

        <div
          role="group"
          aria-label="Planning horizon"
          className="inline-flex w-full rounded-lg bg-slate-100 p-1 sm:w-auto"
        >
          <button
            type="button"
            onClick={() => onHorizonChange("weekly")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none cursor-pointer ${
              horizon === "weekly"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            7-Day Tactical (Weekly)
          </button>
          <button
            type="button"
            onClick={() => onHorizonChange("monthly")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none cursor-pointer ${
              horizon === "monthly"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            30-Day Strategic (Monthly)
          </button>
        </div>
      </div>

      {horizon === "monthly" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Displaying coarse section-level possession projections. Exact slots
            finalized within weekly horizon.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.iconClass}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {metric.label}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {metric.value}
                </p>
              </div>
            </div>
          );
        })}

        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm ${
            stats.activeConflictsCount > 0
              ? "border-red-200 bg-red-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              stats.activeConflictsCount > 0
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              Conflicts Pending Review
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <p
                className={`text-lg font-bold ${
                  stats.activeConflictsCount > 0
                    ? "text-red-700"
                    : "text-slate-900"
                }`}
              >
                {stats.activeConflictsCount}
              </p>
              {stats.activeConflictsCount > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white animate-pulse">
                  Action needed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}