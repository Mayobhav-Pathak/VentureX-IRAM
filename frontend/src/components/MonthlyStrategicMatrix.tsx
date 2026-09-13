import { useEffect, useMemo, useState } from "react";
import { ChevronRight, X, Layers3, ListChecks, ShieldAlert } from "lucide-react";
import type { Block } from "./MaintenanceDashboard";
import { MonthlyTaskRisk } from "./GanttChipRiskBadges";

export type Section = {
  id: string;
  name: string;
};

export type MonthlyData = {
  section_id: string;
  week_number: number;
  total_possession_hours: number;
  scheduled_jobs_count: number;
  backlog_severity_index: number;
};

export type LongLeadJob = {
  id: string;
  defect_code: string;
  department: string;
  duration_mins: number;
  priority_score: number;
};

type SHAPDriver = {
  feature: string;
  impact: number;
  description: string;
};

type ExplainabilityMetrics = {
  job_id: string;
  predicted_risk_score: number;
  top_drivers: SHAPDriver[];
};

type MonthlyStrategicMatrixProps = {
  sections: Section[];
  monthlyData: MonthlyData[];
  tacticalBlocks?: Block[];
  onSelectCell?: (section: Section, cell: MonthlyData) => void;
};

function severityClass(index: number): string {
  if (index > 65) return "border-red-300 bg-red-100 text-red-950";
  if (index >= 30) return "border-amber-300 bg-amber-100 text-amber-950";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function formatFeature(name: string): string {
  return name.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchExplainability(jobId: string): Promise<ExplainabilityMetrics> {
  const response = await fetch(
    `http://127.0.0.1:8000/jobs/${encodeURIComponent(jobId)}/explain`
  );
  if (!response.ok) throw new Error("Unable to load explainability metrics");
  return response.json();
}

export function MonthlyStrategicMatrix({
  sections,
  monthlyData,
  tacticalBlocks = [],
  onSelectCell,
}: MonthlyStrategicMatrixProps) {
  const matrix = useMemo(
    () =>
      new Map(
        monthlyData.map((item) => [
          `${item.section_id}-${item.week_number}`,
          item,
        ]),
      ),
    [monthlyData]
  );

  const [selectedCell, setSelectedCell] = useState<{
    section: Section;
    data: MonthlyData;
  } | null>(() => {
    const firstItem = monthlyData[0];
    if (!firstItem) return null;
    const firstSection = sections.find((s) => s.id === firstItem.section_id) ?? sections[0];
    return { section: firstSection, data: firstItem };
  });

  const [activeTab, setActiveTab] = useState<"tasks" | "risk">("tasks");
  const [jobs, setJobs] = useState<LongLeadJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [riskMetrics, setRiskMetrics] = useState<ExplainabilityMetrics | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  // Sync jobs: if Week 1, read from tacticalBlocks; else query future plan
  useEffect(() => {
    if (!selectedCell) {
      setJobs([]);
      return;
    }

    const { section, data } = selectedCell;

    if (data.week_number === 1) {
      // Pull all jobs assigned to blocks in this section
      const matchingBlocks = tacticalBlocks.filter((b) => b.section_id === section.id);
      const extractedJobs: LongLeadJob[] = [];
      const seen = new Set<string>();

      matchingBlocks.forEach((block) => {
        block.jobs.forEach((j) => {
          if (!seen.has(j.id)) {
            seen.add(j.id);
            extractedJobs.push({
              id: j.id,
              defect_code: j.title,
              department: j.department,
              duration_mins: j.duration_mins,
              priority_score: 85.0, // fallback priority score
            });
          }
        });
      });

      setJobs(extractedJobs);
      setSelectedJobId(extractedJobs.length > 0 ? extractedJobs[0].id : null);
      setLoadingJobs(false);
      setJobsError(null);
    } else {
      let active = true;
      setLoadingJobs(true);
      setJobsError(null);

      fetch(
        `http://127.0.0.1:8000/api/plan/monthly/sections/${encodeURIComponent(
          section.id
        )}/weeks/${data.week_number}/jobs`
      )
        .then((res) => {
          if (!res.ok) throw new Error("Unable to load strategic jobs");
          return res.json();
        })
        .then((backendJobs) => {
          if (active) {
            setJobs(backendJobs);
            setSelectedJobId(backendJobs.length > 0 ? backendJobs[0].id : null);
          }
        })
        .catch((err) => {
          if (active) setJobsError(err.message);
        })
        .finally(() => {
          if (active) setLoadingJobs(false);
        });

      return () => {
        active = false;
      };
    }
  }, [selectedCell, tacticalBlocks]);

  // Fetch explainability when selected job changes
  useEffect(() => {
    if (!selectedJobId) {
      setRiskMetrics(null);
      return;
    }

    let active = true;
    setLoadingRisk(true);
    setRiskError(null);

    fetchExplainability(selectedJobId)
      .then((data) => {
        if (active) setRiskMetrics(data);
      })
      .catch((err) => {
        if (active) setRiskError(err.message);
      })
      .finally(() => {
        if (active) setLoadingRisk(false);
      });

    return () => {
      active = false;
    };
  }, [selectedJobId]);

  const handleCellClick = (section: Section, cell: MonthlyData) => {
    setSelectedCell({ section, data: cell });
    onSelectCell?.(section, cell);
  };

  const activeJob = jobs.find((j) => j.id === selectedJobId) ?? jobs[0] ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      {/* 30-Day Grid */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-190">
            <div className="grid grid-cols-[220px_repeat(4,minmax(130px,1fr))] border-b border-slate-200 bg-slate-50">
              <div className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                Track Section
              </div>
              {[1, 2, 3, 4].map((week) => (
                <div
                  key={week}
                  className="border-l border-slate-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  Week {week}
                </div>
              ))}
            </div>

            {sections.map((section) => (
              <div
                key={section.id}
                className="grid grid-cols-[220px_repeat(4,minmax(130px,1fr))] border-b border-slate-200 last:border-b-0"
              >
                <div className="flex min-h-28 items-center bg-slate-50 px-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {section.name}
                    </p>
                    <p className="text-xs text-slate-500">{section.id}</p>
                  </div>
                </div>

                {[1, 2, 3, 4].map((week) => {
                  const cell = matrix.get(`${section.id}-${week}`);
                  const isSelected =
                    selectedCell?.section.id === section.id &&
                    selectedCell.data.week_number === week;

                  return (
                    <div key={week} className="border-l border-slate-200 p-2.5">
                      {cell ? (
                        <button
                          type="button"
                          onClick={() => handleCellClick(section, cell)}
                          className={`group flex min-h-24 w-full cursor-pointer flex-col justify-between rounded-lg border p-3 text-left transition-all hover:shadow-md ${severityClass(
                            cell.backlog_severity_index
                          )} ${
                            isSelected
                              ? "ring-4 ring-blue-500/70 border-blue-600 scale-[1.02] shadow-md z-10"
                              : "hover:scale-[1.01]"
                          }`}
                        >
                          <div className="flex items-start justify-between w-full">
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold shadow-xs">
                              {cell.total_possession_hours.toFixed(1)}h
                            </span>
                            <ChevronRight
                              className={`h-4 w-4 opacity-50 transition-transform ${
                                isSelected
                                  ? "rotate-90 opacity-100 text-blue-700"
                                  : "group-hover:translate-x-0.5"
                              }`}
                            />
                          </div>
                          <div className="mt-2">
                            <p className="text-xs font-bold text-slate-800">
                              {cell.scheduled_jobs_count} jobs scheduled
                            </p>
                            <p className="text-[10px] opacity-75">
                              Backlog Index {cell.backlog_severity_index.toFixed(0)}
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                          No planned work
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-slate-300 bg-slate-100" />
              Low (&lt;30)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-amber-300 bg-amber-200" />
              Moderate (30–65)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs border border-red-300 bg-red-200" />
              Critical (&gt;65)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any block to inspect work packages & ML scores
          </span>
        </div>
      </section>

      {/* Right Drawer */}
      <aside className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-145">
        {selectedCell ? (
          <>
            <div className="border-b border-slate-200 p-4 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                    Week {selectedCell.data.week_number} Work Package
                  </span>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedCell.section.name}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {selectedCell.data.total_possession_hours}h possession · Index {selectedCell.data.backlog_severity_index}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* View Switcher Tabs */}
              <div className="mt-3 flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("tasks")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "tasks"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  Scheduled Tasks ({jobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("risk")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "risk"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Risk Assessment
                </button>
              </div>
            </div>

            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {loadingJobs && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                )}

                {jobsError && (
                  <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{jobsError}</p>
                )}

                {!loadingJobs && (
                  <div className="space-y-2">
                    {jobs.map((job) => {
                      const isSelected = activeJob?.id === job.id;
                      return (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJobId(job.id)}
                          className={`w-full text-left rounded-lg border p-3 transition-all cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-900 leading-snug">
                                {job.defect_code}
                              </p>
                              <p className="font-mono text-[10px] text-slate-500 mt-0.5">{job.id}</p>
                            </div>
                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              {job.department}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                            <span className="text-slate-500">{job.duration_mins} mins</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJobId(job.id);
                                setActiveTab("risk");
                              }}
                              className="text-blue-600 font-bold hover:underline text-[10px]"
                            >
                              View Risk →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Risk Assessment Tab */}
            {activeTab === "risk" && (
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {jobs.length > 1 && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Inspecting Job
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {jobs.map((j) => (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => setSelectedJobId(j.id)}
                          className={`rounded px-2 py-1 text-[11px] font-mono cursor-pointer transition ${
                            activeJob?.id === j.id
                              ? "bg-blue-600 text-white font-bold"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {j.id.split("-").slice(-2).join("-")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeJob && riskMetrics && (
                  <MonthlyTaskRisk
                    fmea={activeJob.priority_score}
                    ml={riskMetrics.predicted_risk_score}
                  />
                )}

                {loadingRisk && (
                  <div className="space-y-3">
                    <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
                  </div>
                )}

                {riskError && (
                  <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{riskError}</p>
                )}

                {!loadingRisk && riskMetrics && activeJob && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                          Rule-Based FMEA
                        </p>
                        <p className="mt-0.5 text-xl font-black text-amber-950">
                          {activeJob.priority_score.toFixed(1)}
                          <span className="text-xs font-normal text-amber-700"> / 100</span>
                        </p>
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                          ML Risk Score
                        </p>
                        <p className="mt-0.5 text-xl font-black text-blue-950">
                          {riskMetrics.predicted_risk_score.toFixed(1)}
                          <span className="text-xs font-normal text-blue-700"> / 100</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-800">Top ML Drivers (SHAP)</p>
                        <span className="text-[10px] text-slate-400">Impact on Failure</span>
                      </div>

                      <div className="mt-2.5 space-y-2.5">
                        {riskMetrics.top_drivers.map((driver) => {
                          const isPositive = driver.impact >= 0;
                          const maxVal = Math.max(
                            ...riskMetrics.top_drivers.map((d) => Math.abs(d.impact)),
                            1
                          );
                          return (
                            <div key={driver.feature} className="text-xs">
                              <div className="flex justify-between text-[11px] font-medium text-slate-700">
                                <span>{formatFeature(driver.feature)}</span>
                                <span className={isPositive ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                                  {isPositive ? "+" : ""}{driver.impact.toFixed(2)}
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    isPositive ? "bg-red-500" : "bg-emerald-500"
                                  }`}
                                  style={{
                                    width: `${(Math.abs(driver.impact) / maxVal) * 100}%`,
                                  }}
                                />
                              </div>
                              <p className="mt-0.5 text-[10px] text-slate-400 leading-tight">
                                {driver.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
            <Layers3 className="h-10 w-10 stroke-1 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">No Section Selected</p>
            <p className="mt-1 text-xs text-slate-400">
              Click any weekly cell in the matrix to view scheduled work packages.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}