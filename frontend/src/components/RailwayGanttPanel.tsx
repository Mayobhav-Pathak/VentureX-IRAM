import  { useMemo } from "react";

export type TrackLine = "UP" | "DOWN" | "BOTH";

export interface Section {
  id: string;
  name: string;
}

export interface ScheduledBlock {
  id: string;
  section_id: string;
  line: TrackLine;
  start_time: string;
  end_time: string;
  departments: string[];
  is_bundled: boolean;
  is_conflict?: boolean;
  has_isolation_buffer?: boolean;
  isolation_buffer_mins?: number;
  post_block_tsr_speed_kmph?: number | null;
  tsr_duration_hours?: number | null;
  title: string;
  department?: string;
  active_work_mins?: number;
  requires_heavy_machinery?: boolean;
  machinery_type?: "BCM" | "CSM" | string;
  transit_mins?: number;
  transit_origin?: string;
}

export interface RailwayGanttProps {
  sections: Section[];
  blocks: ScheduledBlock[];
  viewStart: string | Date;
  viewEnd?: string | Date;
  selectedBlockId?: string | null;
  onSelectBlock?: (block: ScheduledBlock) => void;
  onConflictClick?: (block: ScheduledBlock) => void;
}

const DEPT_COLORS: Record<string, string> = {
  ENG: "#0b4f8a", // Railway Cobalt Blue
  SNT: "#d97706", // SNT Amber
  TRD: "#7e22ce", // TRD Purple
};

function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function RailwayGantt({
  sections,
  blocks,
  viewStart,
  selectedBlockId,
  onSelectBlock,
  onConflictClick,
}: RailwayGanttProps) {
  const baseDate = useMemo(() => {
    const d = new Date(viewStart);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [viewStart]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + index);
      return d;
    });
  }, [baseDate]);

  const getBlockBackground = (blk: ScheduledBlock) => {
    if (blk.is_conflict) {
      return "repeating-linear-gradient(135deg, #dc2626 0px, #dc2626 8px, #b91c1c 8px, #b91c1c 16px)";
    }
    if (blk.is_bundled || blk.departments.length > 1) {
      const d1 = blk.departments[0] || "ENG";
      const d2 = blk.departments[1] || "SNT";
      const c1 = DEPT_COLORS[d1] || "#0b4f8a";
      const c2 = DEPT_COLORS[d2] || "#d97706";
      return `repeating-linear-gradient(135deg, ${c1} 0px, ${c1} 10px, ${c2} 10px, ${c2} 20px)`;
    }
    const dept = blk.department || blk.departments[0] || "ENG";
    return DEPT_COLORS[dept] || "#0b4f8a";
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-x-auto bg-white">
      {/* 7-Day Header Strip */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 min-w-175 h-11.25">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center p-1 text-center"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase font-railway">
              {day.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className="text-xs font-bold text-slate-800 font-mono">
              {day.toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
            </span>
          </div>
        ))}
      </div>

      {/* Synchronized Section Track Rows */}
      <div className="divide-y divide-slate-200 min-w-175">
        {sections.map((section) => {
          const sectionBlocks = blocks.filter((b) => b.section_id === section.id);

          return (
            <div
              key={section.id}
              className="relative h-21 bg-white hover:bg-slate-50/40 transition"
            >
              <div className="grid grid-rows-2 h-full">
                {(["UP", "DOWN"] as const).map((line) => (
                  <div
                    key={line}
                    className={`relative h-11.25 grid grid-cols-7 ${
                      line === "UP" ? "border-b border-slate-100" : ""
                    }`}
                  >
                    {/* Directional Tag */}
                    <span className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded bg-white/95 px-1 py-0.2 text-[8px] font-bold font-mono text-slate-400 border border-slate-200 shadow-xs pointer-events-none">
                      {line === "DOWN" ? "DN" : line}
                    </span>

                    {/* Day Cells */}
                    {days.map((day) => {
                      const dayStart = new Date(day);
                      dayStart.setHours(0, 0, 0, 0);
                      const dayEnd = new Date(day);
                      dayEnd.setHours(23, 59, 59, 999);

                      const dayBlocks = sectionBlocks.filter((b) => {
                        const matchesLine = b.line === line || b.line === "BOTH";
                        const bStart = new Date(b.start_time).getTime();
                        return (
                          matchesLine &&
                          bStart >= dayStart.getTime() &&
                          bStart <= dayEnd.getTime()
                        );
                      });

                      return (
                        <div
                          key={`${line}-${day.toISOString()}`}
                          className="relative h-full border-r border-slate-100 last:border-r-0 p-1 flex items-center gap-1 overflow-hidden"
                        >
                          {dayBlocks.map((blk) => {
                            const isSelected = blk.id === selectedBlockId;
                            const hasTsr = Boolean(
                              blk.post_block_tsr_speed_kmph && blk.tsr_duration_hours
                            );
                            const startTime = formatTime(blk.start_time);
                            const endTime = formatTime(blk.end_time);

                            return (
                              <button
                                key={blk.id}
                                type="button"
                                onClick={() => {
                                  onSelectBlock?.(blk);
                                  if (blk.is_conflict) {
                                    onConflictClick?.(blk);
                                  }
                                }}
                                title={`${blk.title}\nTime: ${startTime}–${endTime} IST\nDepartments: ${blk.departments.join(" + ")}`}
                                className={`group relative flex-1 h-8.5 cursor-pointer rounded border text-left shadow-xs transition-all overflow-hidden flex items-stretch select-none ${
                                  blk.is_conflict
                                    ? "animate-pulse ring-2 ring-red-500 border-red-600 z-10"
                                    : isSelected
                                    ? "ring-2 ring-[#0b4f8a] border-[#0b4f8a] z-10 shadow-md"
                                    : "border-slate-300 hover:border-[#0b4f8a] hover:shadow"
                                }`}
                              >
                                {/* Earthing Badge */}
                                {blk.has_isolation_buffer && (
                                  <span
                                    title={`⚡ OHE Earthing: ${blk.isolation_buffer_mins ?? 20}m`}
                                    className="bg-violet-100/90 text-violet-950 border-r border-violet-300 px-1 flex items-center justify-center text-[8px] font-black shrink-0"
                                  >
                                    ⚡{blk.isolation_buffer_mins ?? 20}m
                                  </span>
                                )}

                                {/* Main Job Badge (Striped Pattern for Bundled) */}
                                <div
                                  style={{ background: getBlockBackground(blk) }}
                                  className="flex-1 px-1.5 flex flex-col justify-center min-w-0 text-white"
                                >
                                  <div className="flex items-center gap-1">
                                    {blk.is_conflict && (
                                      <span className="h-3 w-3 rounded-full bg-white text-red-600 font-black text-[9px] flex items-center justify-center shrink-0">
                                        !
                                      </span>
                                    )}
                                    <span className="text-[9px] font-black truncate leading-tight drop-shadow-xs">
                                      {blk.is_bundled
                                        ? `${blk.departments.join(" + ")} (BUNDLED)`
                                        : `${blk.departments[0] || blk.department} · ${blk.title}`}
                                    </span>
                                  </div>
                                  <span className="text-[8px] font-mono opacity-95 truncate leading-none mt-0.5 drop-shadow-xs">
                                    {startTime}–{endTime} IST
                                  </span>
                                </div>

                                {/* TSR Indicator Tag */}
                                {hasTsr && (
                                  <span
                                    title={`TSR ${blk.post_block_tsr_speed_kmph} km/h (${blk.tsr_duration_hours}h)`}
                                    className="bg-amber-100 text-amber-950 border-l border-amber-300 px-1 flex items-center justify-center text-[8px] font-bold shrink-0"
                                  >
                                    {blk.post_block_tsr_speed_kmph}k
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RailwaySchedulePanel(props: RailwayGanttProps) {
  return (
    <div className="w-full h-full flex flex-col min-w-0 overflow-hidden">
      <RailwayGantt {...props} />
    </div>
  );
}