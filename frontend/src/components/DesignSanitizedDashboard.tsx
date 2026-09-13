// frontend/src/components/DesignSanitizedDashboard.tsx

export type DashboardMetrics = {
  corridorUptimePercent: number;
  ruleBasedFmeaScore: number;
  mlRiskScore: number;
  possessionHours: number;
  backlogSeverityIndex: number;
};

export type DesignSanitizedDashboardProps = {
  metrics: DashboardMetrics;
  jobId: string;
  sectionName: string;
  departments: string[];
  topDrivers: Array<{ feature: string; impact: number }>;
  onViewRiskAssessment?: () => void;
};

export default function DesignSanitizedDashboard({
  metrics,
  jobId,
  sectionName,
  departments,
  topDrivers,
  onViewRiskAssessment,
}: DesignSanitizedDashboardProps) {
  return (
    <main className="space-y-8 bg-white p-6 text-slate-900">
      <section className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="border-l-4 border-slate-900 pl-6">
          <p className="text-sm font-medium text-slate-600">
            Corridor uptime
          </p>
          <p className="mt-2 font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-950">
            {metrics.corridorUptimePercent.toFixed(1)}%
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Target availability across the Delhi–Agra maintenance corridor.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-l border-slate-200 pl-6">
          <div>
            <p className="text-sm text-slate-500">Rule-based FMEA</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {metrics.ruleBasedFmeaScore.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">ML risk score</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {metrics.mlRiskScore.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Possession hours</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {metrics.possessionHours.toFixed(1)}h
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Backlog severity index</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {metrics.backlogSeverityIndex.toFixed(0)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="border border-slate-200 bg-transparent">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Track section
              </p>
              <p className="mt-0.5 text-sm text-slate-500">{sectionName}</p>
            </div>
            <div>
              <p className="text-right text-sm font-medium text-slate-800">
                Department legend
              </p>
              <div className="mt-2 flex gap-2">
                {departments.map((department) => (
                  <span
                    key={department}
                    className="border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                  >
                    {department}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid min-h-44 grid-cols-4 divide-x divide-slate-200">
            {[
              { label: "Week 1", hours: 6.5, index: 85 },
              { label: "Week 2", hours: 4.0, index: 61 },
              { label: "Week 3", hours: 8.0, index: 74 },
              { label: "Week 4", hours: 2.5, index: 29 },
            ].map((week) => (
              <div key={week.label} className="flex flex-col justify-between p-4">
                <p className="text-sm font-medium text-slate-700">
                  {week.label}
                </p>
                <div className="mt-8 space-y-1">
                  <span className="block font-mono text-xl font-semibold tabular-nums">
                    {week.hours.toFixed(1)}h
                  </span>
                  <span className="block text-xs text-slate-500">
                    Planned possession
                  </span>
                  <span className="mt-3 block text-sm font-medium text-slate-700">
                    Index {week.index}
                  </span>
                  <span className="block text-xs text-slate-500">
                    Backlog severity
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="border-l-4 border-slate-900 pl-5">
          <p className="text-sm font-medium text-slate-600">Inspecting job</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{jobId}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Maintenance priority is based on asset condition, operational
            exposure, and overdue history.
          </p>
          <button
            type="button"
            onClick={onViewRiskAssessment}
            className="mt-5 cursor-pointer text-sm font-semibold text-slate-900 underline decoration-slate-400 underline-offset-4 hover:decoration-slate-900"
          >
            View risk assessment
          </button>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border border-slate-200 bg-transparent p-5">
          <p className="text-sm font-medium text-slate-800">
            Rule-based FMEA
          </p>
          <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-slate-950">
            {metrics.ruleBasedFmeaScore.toFixed(1)}
            <span className="ml-1 text-lg font-medium text-slate-500">/ 100</span>
          </p>
        </div>

        <div className="border border-slate-200 bg-transparent p-5">
          <p className="text-sm font-medium text-slate-800">ML risk score</p>
          <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-slate-950">
            {metrics.mlRiskScore.toFixed(1)}
            <span className="ml-1 text-lg font-medium text-slate-500">/ 100</span>
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5">
        <p className="text-sm font-medium text-slate-800">
          Top ML drivers (SHAP)
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {topDrivers.map((driver) => (
            <div key={driver.feature} className="border-l-2 border-slate-300 pl-3">
              <p className="text-sm font-medium text-slate-800">
                {driver.feature.replaceAll("_", " ")}
              </p>
              <p
                className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                  driver.impact >= 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {driver.impact >= 0 ? "+" : ""}
                {driver.impact.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}