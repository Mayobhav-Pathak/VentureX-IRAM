import { useEffect, useMemo, useState } from "react";

export type Department = "ENG" | "SNT" | "TRD";

export type Section = {
  id: string;
  name: string;
};

export type BlockJob = {
  id: string;
  department: Department;
  title: string;
  asset_id: string;
  duration_mins: number;
};

export type Block = {
  id: string;
  section_id: string;
  start_time: string;
  end_time: string;
  departments: Department[];
  is_bundled: boolean;
  is_conflict: boolean;
  title: string;
  jobs: BlockJob[];
};

type ExplainDriver = {
  feature: string;
  impact: number;
  description: string;
};

type ExplainabilityMetrics = {
  job_id: string;
  predicted_risk_score: number;
  top_drivers: ExplainDriver[];
};

type MaintenanceDashboardProps = {
  sections: Section[];
  blocks: Block[];
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  selectedJobId?: string | null;
  onSelectJob?: (jobId: string) => void;
  viewStart?: string | Date;
};

const departmentColor: Record<Department, string> = {
  ENG: "bg-blue-600",
  SNT: "bg-amber-500",
  TRD: "bg-violet-600",
};

const DEFAULT_VIEW_START = "2026-09-08T00:00:00Z";

function parseAnchorDate(input?: string | Date): Date {
  const date = input ? new Date(input) : new Date(DEFAULT_VIEW_START);
  return Number.isNaN(date.getTime()) ? new Date(DEFAULT_VIEW_START) : date;
}

function formatFeature(feature: string): string {
  return feature
    .replaceAll("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function formatHour(isoString: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(isoString));
}

async function fetchExplainability(jobId: string): Promise<ExplainabilityMetrics> {
  const response = await fetch(
    `http://127.0.0.1:8000/jobs/${encodeURIComponent(jobId)}/explain`
  );
  if (!response.ok) {
    throw new Error("Unable to load explainability metrics");
  }
  return response.json();
}

function GanttGrid({
  sections,
  blocks,
  selectedBlockId,
  onSelectBlock,
  viewStartDate,
}: {
  sections: Section[];
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  viewStartDate?: string | Date;
}) {
  const viewStart = useMemo(() => parseAnchorDate(viewStartDate), [viewStartDate]);
  const viewStartMs = viewStart.getTime();

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(viewStartMs);
        day.setUTCDate(day.getUTCDate() + index);
        return day;
      }),
    [viewStartMs]
  );

  const viewEnd = useMemo(() => {
    const end = new Date(viewStartMs);
    end.setUTCDate(end.getUTCDate() + 7);
    return end;
  }, [viewStartMs]);

  const viewEndMs = viewEnd.getTime();
  const viewDuration = Math.max(viewEndMs - viewStartMs, 1);

  const getBlockPosition = (block: Block) => {
    const rawStart = new Date(block.start_time).getTime();
    const rawEnd = new Date(block.end_time).getTime();
    const start = Math.max(rawStart, viewStartMs);
    const end = Math.min(rawEnd, viewEndMs);

    const left = ((start - viewStartMs) / viewDuration) * 100;
    const width = ((end - start) / viewDuration) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 2.5)}%`,
    };
  };

  const isVisible = (block: Block) => {
    const start = new Date(block.start_time).getTime();
    const end = new Date(block.end_time).getTime();
    return end > viewStartMs && start < viewEndMs;
  };

  return (
    <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="min-w-240">
        <div className="grid grid-cols-[220px_1fr] border-b border-slate-200 bg-slate-50">
          <div className="border-r border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Track Section
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="border-r border-slate-200 px-3 py-3 text-center text-xs font-semibold text-slate-600 last:border-r-0"
              >
                {day.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  timeZone: "UTC",
                })}
              </div>
            ))}
          </div>
        </div>

        {sections.map((section) => {
          const rowBlocks = blocks.filter(
            (block) => block.section_id === section.id && isVisible(block)
          );

          return (
            <div
              key={section.id}
              className="grid min-h-24 grid-cols-[220px_1fr] border-b border-slate-200 last:border-b-0"
            >
              <div className="flex items-center border-r border-slate-200 bg-slate-50 px-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {section.name}
                  </p>
                  <p className="text-xs text-slate-500">{section.id}</p>
                </div>
              </div>

              <div className="relative min-h-24 bg-white">
                <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      className="border-r border-slate-100 last:border-r-0"
                    />
                  ))}
                </div>

                {rowBlocks.map((block) => {
                  const active = block.id === selectedBlockId;
                  const primaryDepartment = block.departments[0] ?? "ENG";

                  return (
                    <button
                      key={block.id}
                      type="button"
                      title={`${block.id} | ${formatHour(block.start_time)} - ${formatHour(block.end_time)} UTC`}
                      onClick={() => onSelectBlock(block.id)}
                      style={getBlockPosition(block)}
                      className={`group absolute top-3 flex h-16 min-w-14 cursor-pointer flex-col justify-between overflow-hidden rounded-md p-1.5 text-left text-xs font-semibold text-white shadow transition-all ${
                        departmentColor[primaryDepartment]
                      } ${
                        block.is_bundled
                          ? "bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.22)_0px,rgba(255,255,255,0.22)_8px,transparent_8px,transparent_16px)]"
                          : ""
                      } ${
                        block.is_conflict
                          ? "animate-pulse border-2 border-red-600 ring-4 ring-red-300 z-10"
                          : "border border-white/40"
                      } ${
                        active
                          ? "z-20 ring-4 ring-blue-500/60 scale-[1.02] shadow-lg border-white"
                          : "hover:z-10 hover:brightness-110"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        {block.is_conflict && (
                          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
                            !
                          </span>
                        )}
                        <span className="truncate text-[10px] opacity-90">
                          {formatHour(block.start_time)}
                        </span>
                        {block.is_bundled && (
                          <span className="ml-auto rounded bg-slate-950/40 px-1 py-0.2 text-[9px] font-bold uppercase">
                            BND
                          </span>
                        )}
                      </div>
                      <span className="truncate text-[11px] font-bold leading-tight">
                        {block.id.replace("BLK-", "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExplainabilityCard({
  selectedBlock,
  selectedJob,
}: {
  selectedBlock: Block | null;
  selectedJob: BlockJob | null;
}) {
  const [metrics, setMetrics] = useState<ExplainabilityMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBlock || !selectedJob) {
      setMetrics(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetchExplainability(selectedJob.id)
      .then((result) => {
        if (active) setMetrics(result);
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBlock?.id, selectedJob?.id]);

  if (!selectedBlock || !selectedJob) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        Select a job to view explainability.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-8 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-8 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-800">
          Explainability metrics unavailable
        </p>
        <p className="mt-1 text-xs text-red-700">
          {error ?? "No explainability data was returned for this job."}
        </p>
      </div>
    );
  }

  const maxImpact = Math.max(
    ...metrics.top_drivers.map((driver) => Math.abs(driver.impact)),
    1
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Why prioritized?</p>
        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
          Risk {metrics.predicted_risk_score.toFixed(1)}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {metrics.top_drivers.map((driver) => {
          const positive = driver.impact >= 0;

          return (
            <div key={driver.feature}>
              <div className="flex justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-700">
                  {formatFeature(driver.feature)}
                </span>
                <span
                  className={
                    positive
                      ? "font-semibold text-red-600"
                      : "font-semibold text-emerald-600"
                  }
                >
                  {positive ? "+" : ""}
                  {driver.impact.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full ${
                    positive ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${(Math.abs(driver.impact) / maxImpact) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{driver.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlockInspector({
  selectedBlock,
  activeJobId,
  onSelectJob,
}: {
  selectedBlock: Block | null;
  activeJobId?: string | null;
  onSelectJob?: (jobId: string) => void;
}) {
  if (!selectedBlock) {
    return (
      <aside className="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Select a maintenance block to inspect its work package.
      </aside>
    );
  }

  const selectedJob =
    selectedBlock.jobs.find((job) => job.id === activeJobId) ??
    selectedBlock.jobs[0] ??
    null;

  return (
    <aside className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Block Inspector
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {selectedBlock.title}
            </h2>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              selectedBlock.is_conflict
                ? "bg-red-100 text-red-700"
                : selectedBlock.is_bundled
                ? "bg-violet-100 text-violet-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {selectedBlock.is_conflict
              ? "Conflict"
              : selectedBlock.is_bundled
              ? "Bundled"
              : "Standard"}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Section: <b>{selectedBlock.section_id}</b> ·{" "}
          {formatHour(selectedBlock.start_time)} - {formatHour(selectedBlock.end_time)} UTC
        </p>
      </div>

      <div className="space-y-4 p-5">
        {selectedBlock.jobs.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Bundled Work Packages
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedBlock.jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => onSelectJob?.(job.id)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    selectedJob?.id === job.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {job.department}: {job.id}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedJob ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">{selectedJob.title}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-700">
                {selectedJob.asset_id}
              </span>
              <span className="text-slate-500">{selectedJob.duration_mins} mins</span>
            </div>
          </div>
        ) : (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            This block has no linked maintenance job.
          </p>
        )}

        <ExplainabilityCard
          selectedBlock={selectedBlock}
          selectedJob={selectedJob}
        />
      </div>
    </aside>
  );
}

export default function MaintenanceDashboard({
  sections,
  blocks,
  selectedBlockId,
  onSelectBlock,
  selectedJobId,
  onSelectJob,
  viewStart = DEFAULT_VIEW_START,
}: MaintenanceDashboardProps) {
  const activeBlockId = selectedBlockId ?? blocks[0]?.id ?? null;

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === activeBlockId) ?? null,
    [blocks, activeBlockId]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <GanttGrid
        sections={sections}
        blocks={blocks}
        selectedBlockId={activeBlockId}
        onSelectBlock={(id) => onSelectBlock?.(id)}
        viewStartDate={viewStart}
      />
      <BlockInspector
        selectedBlock={selectedBlock}
        activeJobId={selectedJobId}
        onSelectJob={onSelectJob}
      />
    </div>
  );
}