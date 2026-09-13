import { useEffect, useState } from "react";
import { CircleHelp, Gauge, Wrench, Zap } from "lucide-react";
import type { BlockJob } from "./MaintenanceDashboard";
import { WeeklyInspectorRisk } from "./GanttChipRiskBadges";

type SHAPDriver = {
  feature: string;
  impact: number;
  description: string;
};

type PrioritizationData = {
  rule_based_fmea_score: number;
  ml_score: number;
  top_shap_impacts: Array<{ feature: string; impact: number }>;
};

type ExplainResponse = {
  job_id: string;
  predicted_risk_score: number;
  top_drivers: SHAPDriver[];
};

type Department = "ENG" | "SNT" | "TRD";

const departmentDetails: Record<
  Department,
  { label: string; description: string; className: string; icon: typeof Wrench }
> = {
  ENG: {
    label: "Engineering",
    description: "Engineering (Permanent Way & Track Maintenance)",
    className: "bg-blue-100 text-blue-800 ring-blue-200",
    icon: Wrench,
  },
  SNT: {
    label: "Signal & Telecommunication",
    description: "Signal & Telecommunication (Interlocking & Track Circuits)",
    className: "bg-amber-100 text-amber-800 ring-amber-200",
    icon: Gauge,
  },
  TRD: {
    label: "Traction Distribution",
    description:
      "Traction Distribution (Overhead Electrification & Sub-stations)",
    className: "bg-violet-100 text-violet-800 ring-violet-200",
    icon: Zap,
  },
};

export function DepartmentLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(Object.keys(departmentDetails) as Department[]).map((department) => {
        const detail = departmentDetails[department];
        const Icon = detail.icon;
        return (
          <div key={department} className="group relative">
            <span
              className={`inline-flex cursor-help items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${detail.className}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {department}
              <CircleHelp className="h-3 w-3 opacity-70" />
            </span>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {detail.description}
              <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-900" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BlockInspector({
  selectedBlock,
  selectedJobId,
  onSelectJob,
}: {
  selectedBlock: any | null;
  selectedJobId: string | null;
  onSelectJob?: (jobId: string) => void;
}) {
  const [prioritization, setPrioritization] = useState<PrioritizationData | null>(null);
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const activeJob: BlockJob | null =
    selectedBlock?.jobs.find((j: BlockJob) => j.id === selectedJobId) ??
    selectedBlock?.jobs[0] ??
    null;

  // Live dynamic score retrieval on job selection change
  useEffect(() => {
    if (!activeJob?.id) {
      setPrioritization(null);
      setExplainData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetch(`http://127.0.0.1:8000/api/jobs/${encodeURIComponent(activeJob.id)}/prioritization`)
        .then((res) => (res.ok ? res.json() : null)),
      fetch(`http://127.0.0.1:8000/jobs/${encodeURIComponent(activeJob.id)}/explain`)
        .then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([prioRes, explainRes]) => {
        if (!isMounted) return;
        setPrioritization(prioRes);
        setExplainData(explainRes);
      })
      .catch((err) => console.error("Error fetching live risk metrics", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeJob?.id]);

  if (!selectedBlock) {
    return (
      <aside className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
        Select a block to inspect its work package.
      </aside>
    );
  }

  // Dynamic values directly from backend
  const liveFmea = prioritization?.rule_based_fmea_score ?? 0;
  const liveMl = explainData?.predicted_risk_score ?? prioritization?.ml_score ?? 0;

  return (
    <aside className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col p-5 space-y-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-blue-700">
          Block Inspector
        </span>
        <h2 className="text-lg font-bold text-slate-900">{selectedBlock.title}</h2>
        <p className="text-xs text-slate-500">{selectedBlock.section_id}</p>
      </div>

      {selectedBlock.jobs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {selectedBlock.jobs.map((job: BlockJob) => (
            <button
              key={job.id}
              type="button"
              onClick={() => onSelectJob?.(job.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                activeJob?.id === job.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {job.department}: {job.id.split("-").slice(-2).join("-")}
            </button>
          ))}
        </div>
      )}

      {activeJob && (
        <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
          <p className="text-xs font-bold text-slate-900">{activeJob.title}</p>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>Asset: {activeJob.asset_id}</span>
            <span>{activeJob.duration_mins} mins</span>
          </div>
        </div>
      )}

      {/* Dynamic Unified Badge */}
      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <WeeklyInspectorRisk fmea={liveFmea} ml={liveMl} />
      )}

      {/* Dynamic SHAP Drivers */}
      {!loading && explainData?.top_drivers && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-700">Key Risk Drivers (SHAP)</p>
          {explainData.top_drivers.map((driver) => (
            <div key={driver.feature} className="text-xs">
              <div className="flex justify-between font-medium">
                <span>{driver.feature.replaceAll("_", " ")}</span>
                <span className={driver.impact >= 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                  {driver.impact >= 0 ? "+" : ""}{driver.impact.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{driver.description}</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}