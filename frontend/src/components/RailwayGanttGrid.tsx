import { useMemo, useState } from "react";

export type Section = {
  id: string;
  name: string;
};

export type MaintenanceBlock = {
  id: string;
  section_id: string;
  start_time: string;
  end_time: string;
  departments: string[];
  is_bundled: boolean;
  is_conflict: boolean;
  title: string;
  assigned_job_ids?: string[];
};

export type ConflictResolutionAction = "bundle" | "reschedule" | "override";

type GanttGridProps = {
  sections: Section[];
  blocks: MaintenanceBlock[];
  selectedBlockId?: string | null;
  onSelectBlock?: (block: MaintenanceBlock) => void;
  onResolveConflict: (conflictBlockId: string, action: ConflictResolutionAction) => void;
  viewStart?: string | Date;
  viewEnd?: string | Date;
};

const departmentColors: Record<string, string> = {
  ENG: "#2563eb",
  SNT: "#f59e0b",
  TRD: "#7c3aed",
};

function startOfToday(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(value);
}

function formatTime(isoStr: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(isoStr));
}

function ConflictModal({
  block,
  onClose,
  onResolveConflict,
}: {
  block: MaintenanceBlock;
  onClose: () => void;
  onResolveConflict: (conflictBlockId: string, action: ConflictResolutionAction) => void;
}) {
  const handleResolve = (action: ConflictResolutionAction) => {
    onResolveConflict(block.id, action);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div
        aria-modal="true"
        role="dialog"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-600">Scheduling Conflict Detected</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{block.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="mt-5 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-slate-600">Corridor Overlap on Section: <b>{block.section_id}</b></p>
          <div className="mt-2 flex flex-wrap gap-2">
            {block.departments.map((department) => (
              <span
                key={department}
                className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                style={{
                  backgroundColor: departmentColors[department] ?? "#64748b",
                }}
              >
                {department}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => handleResolve("bundle")}
            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Bundle Departments Together
          </button>
          <button
            type="button"
            onClick={() => handleResolve("reschedule")}
            className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Shift Window to Next Available Slot
          </button>
          <button
            type="button"
            onClick={() => handleResolve("override")}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Manual Priority Override
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RailwayGanttGrid({
  sections,
  blocks,
  selectedBlockId,
  onSelectBlock,
  onResolveConflict,
  viewStart,
  viewEnd,
}: GanttGridProps) {
  const [selectedConflict, setSelectedConflict] = useState<MaintenanceBlock | null>(null);

  const activeViewStart = useMemo(
    () => new Date(viewStart ?? startOfToday()),
    [viewStart],
  );

  const activeViewEnd = useMemo(() => {
    if (viewEnd) return new Date(viewEnd);
    const end = new Date(activeViewStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [activeViewStart, viewEnd]);

  const viewStartMs = activeViewStart.getTime();
  const viewEndMs = activeViewEnd.getTime();
  const viewDurationMs = Math.max(viewEndMs - viewStartMs, 1);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(activeViewStart);
        day.setDate(day.getDate() + index);
        return day;
      }),
    [activeViewStart],
  );

  const visibleBlocks = useMemo(
    () =>
      blocks.filter((block) => {
        const blockStart = new Date(block.start_time).getTime();
        const blockEnd = new Date(block.end_time).getTime();
        return blockEnd > viewStartMs && blockStart < viewEndMs;
      }),
    [blocks, viewEndMs, viewStartMs],
  );

  const getBlockStyle = (block: MaintenanceBlock) => {
    const startMs = new Date(block.start_time).getTime();
    const endMs = new Date(block.end_time).getTime();
    const clampedStart = Math.max(startMs, viewStartMs);
    const clampedEnd = Math.min(endMs, viewEndMs);
    const left = ((clampedStart - viewStartMs) / viewDurationMs) * 100;
    const width = ((clampedEnd - clampedStart) / viewDurationMs) * 100;

    const firstColor = departmentColors[block.departments[0]] ?? "#64748b";
    const secondColor =
      departmentColors[block.departments[1] ?? block.departments[0]] ?? "#64748b";

    return {
      left: `${left}%`,
      width: `${Math.max(width, 2.2)}%`, // Ensures block is comfortably clickable & legible
      background: block.is_bundled
        ? `repeating-linear-gradient(135deg, ${firstColor} 0px, ${firstColor} 8px, ${secondColor} 8px, ${secondColor} 16px)`
        : firstColor,
    };
  };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-w-225 grid-cols-[220px_1fr] border-b border-slate-200">
          <div className="border-r border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Track Section
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="border-r border-slate-200 px-3 py-3 text-center text-xs font-semibold text-slate-600 last:border-r-0"
              >
                {formatDate(day)}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-225">
          {sections.map((section) => {
            const rowBlocks = visibleBlocks.filter(
              (block) => block.section_id === section.id,
            );

            return (
              <div
                key={section.id}
                className="grid min-h-20 grid-cols-[220px_1fr] border-b border-slate-200 last:border-b-0"
              >
                <div className="flex items-center border-r border-slate-200 bg-slate-50 px-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{section.name}</p>
                    <p className="text-xs text-slate-500">{section.id}</p>
                  </div>
                </div>

                <div className="relative min-h-20 bg-white">
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
                    {days.map((day) => (
                      <div
                        key={day.toISOString()}
                        className="border-r border-slate-100 last:border-r-0"
                      />
                    ))}
                  </div>

                  {rowBlocks.map((block) => {
                    const isSelected = selectedBlockId === block.id;

                    return (
                      <button
                        key={block.id}
                        type="button"
                        title={`${block.id} | ${formatTime(block.start_time)} - ${formatTime(block.end_time)} UTC`}
                        onClick={() => {
                          onSelectBlock?.(block);
                          if (block.is_conflict) {
                            setSelectedConflict(block);
                          }
                        }}
                        style={getBlockStyle(block)}
                        className={`group absolute top-2.5 flex h-14 min-w-16.5 cursor-pointer flex-col justify-between overflow-hidden rounded-md p-1.5 text-left text-xs font-semibold text-white shadow transition-all hover:scale-105 hover:z-20 ${
                          block.is_conflict
                            ? "animate-pulse border-2 border-red-600 ring-4 ring-red-300 z-10"
                            : isSelected
                            ? "ring-4 ring-blue-500/50 border border-white z-10"
                            : "border border-white/30 hover:border-white"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          {block.is_conflict && (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
                              !
                            </span>
                          )}
                          <span className="truncate text-[10px] opacity-90">
                            {formatTime(block.start_time)}
                          </span>
                        </div>

                        <span className="truncate text-[11px] font-bold tracking-tight">
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

      {selectedConflict && (
        <ConflictModal
          block={selectedConflict}
          onClose={() => setSelectedConflict(null)}
          onResolveConflict={onResolveConflict}
        />
      )}
    </>
  );
}