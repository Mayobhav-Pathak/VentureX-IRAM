// frontend/src/components/MonthlyStrategicRollup.tsx
import React, { useMemo, useState } from "react";
import { BarChart3, ChevronRight, Filter,  MapPin } from "lucide-react";
import type { MaintenanceBlock } from "../App";

const CORRIDOR_SECTIONS = [
  { id: "ALL", name: "Entire Corridor (All Sections)" },
  { id: "NDLS-TKD", name: "New Delhi - Tuglakabad" },
  { id: "TKD-FDB", name: "Tuglakabad - Faridabad" },
  { id: "FDB-PWL", name: "Faridabad - Palwal" },
  { id: "PWL-KSV", name: "Palwal - Kosi Kalan" },
  { id: "KSV-MTJ", name: "Kosi Kalan - Mathura" },
  { id: "MTJ-AGC", name: "Mathura - Agra Cantt" },
];

interface Props {
  blocks: MaintenanceBlock[];
  selectedBlockId: string | null;
  selectedSectionId?: string;
  onSelectBlock: (blockId: string, jobId?: string) => void;
  onSelectSection?: (sectionId: string) => void;
}

export const StrategicMonthlyRollup: React.FC<Props> = ({
  blocks,
  selectedBlockId,
  selectedSectionId = "ALL",
  onSelectBlock,
  onSelectSection,
}) => {
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(1);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>(selectedSectionId);

  // Sync internal filter if selectedSectionId changes from Metro map click
  React.useEffect(() => {
    if (selectedSectionId) {
      setActiveSectionFilter(selectedSectionId);
    }
  }, [selectedSectionId]);

  const handleSectionChange = (secId: string) => {
    setActiveSectionFilter(secId);
    if (onSelectSection) onSelectSection(secId);
  };

  // 1. Filter blocks by chosen section first
  const scopedBlocks = useMemo(() => {
    if (activeSectionFilter === "ALL") return blocks;
    return blocks.filter((b) => b.section_id === activeSectionFilter);
  }, [blocks, activeSectionFilter]);

  // 2. Compute dynamic, distinct week metrics for the scoped section
  const weekBuckets = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    return [1, 2, 3, 4].map((weekNum) => {
      const start = new Date(base);
      start.setDate(base.getDate() + (weekNum - 1) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      const weekBlocks = scopedBlocks.filter((b) => {
        const bTime = new Date(b.start_time).getTime();
        return bTime >= start.getTime() && bTime < end.getTime();
      });

      let engMins = 0;
      let sntMins = 0;
      let trdMins = 0;

      weekBlocks.forEach((b) => {
        const dur = (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / (60 * 1000);
        if (b.departments.includes("ENG")) engMins += dur;
        if (b.departments.includes("SNT")) sntMins += dur;
        if (b.departments.includes("TRD")) trdMins += dur;
      });

      const totalHours = (engMins + sntMins + trdMins) / 60;
      // Target capacity baseline adapts whether looking at 1 section (~12h) or all sections (~45h)
      const targetBase = activeSectionFilter === "ALL" ? 45 : 12;
      const capacityUtilization = Math.min(Math.round((totalHours / targetBase) * 100), 100);

      return {
        weekNum,
        label: `Week ${weekNum}`,
        dateRange: `${start.toLocaleDateString("en-US", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("en-US", { day: "2-digit", month: "short" })}`,
        blocks: weekBlocks,
        capacityUtilization,
        engHours: (engMins / 60).toFixed(1),
        sntHours: (sntMins / 60).toFixed(1),
        trdHours: (trdMins / 60).toFixed(1),
        dominantRisk: capacityUtilization > 75 ? "HIGH" : capacityUtilization > 55 ? "MEDIUM" : "OPTIMAL",
      };
    });
  }, [scopedBlocks, activeSectionFilter]);

  const activeWeekData = weekBuckets.find((w) => w.weekNum === selectedWeekNum) || weekBuckets[0];

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Strategic Altitude Header */}
      <div className="bg-linear-to-r from-[#0b4f8a]/10 via-amber-500/10 to-transparent border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#0b4f8a] text-white flex items-center justify-center shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider font-railway text-[#0b4f8a]">
                30-Day Strategic Corridor Altitude
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                MACRO CAPACITY PLANNING
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Coarse Section-Level Projections • Rollup Aggregation • Rolling 4-Week Track Defect Backlog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right font-railway">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Monthly Capacity</span>
            <p className="text-base font-black text-slate-900">240 Possession Hours</p>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Backlog Clearance</span>
            <p className="text-base font-black text-emerald-700">94.2% Complete</p>
          </div>
        </div>
      </div>

      {/* Section Filter Pill Bar */}
    <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2 flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-2 shrink-0">
          <Filter className="h-3.5 w-3.5 text-[#0b4f8a]" />
          <span>Filter Section:</span>
        </div>
        {CORRIDOR_SECTIONS.map((sec) => {
          const isSelected = activeSectionFilter === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => handleSectionChange(sec.id)}
              className={`cursor-pointer whitespace-nowrap rounded-md px-3 py-1 text-xs font-bold transition ${
                isSelected
                  ? "bg-[#0b4f8a] text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {sec.name}
            </button>
          );
        })}
      </div>

      {/* Week 1–4 Rollup Cards */}
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {weekBuckets.map((w) => {
            const isSelected = selectedWeekNum === w.weekNum;
            return (
              <div
                key={w.weekNum}
                onClick={() => setSelectedWeekNum(w.weekNum)}
                className={`cursor-pointer rounded-xl border p-4 transition shadow-xs ${
                  isSelected
                    ? "border-[#0b4f8a] bg-blue-50/50 ring-2 ring-[#0b4f8a] shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div>
                    <span className="text-sm font-black font-railway text-slate-900">{w.label}</span>
                    <p className="text-[11px] font-mono text-slate-500">{w.dateRange}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      w.dominantRisk === "HIGH"
                        ? "bg-rose-600 text-white"
                        : w.dominantRisk === "MEDIUM"
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {w.dominantRisk} DEMAND
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">Capacity Load</span>
                      <span className="font-mono text-slate-900 font-bold">{w.capacityUtilization}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          w.capacityUtilization > 75 ? "bg-rose-600" : w.capacityUtilization > 55 ? "bg-[#f37021]" : "bg-[#0b4f8a]"
                        }`}
                        style={{ width: `${w.capacityUtilization}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 grid grid-cols-3 gap-2 border-t border-slate-200/60 text-center">
                    <div className="rounded bg-blue-50/80 p-1">
                      <span className="text-[10px] font-bold text-blue-700">ENG</span>
                      <p className="text-xs font-black text-slate-800">{w.engHours}h</p>
                    </div>
                    <div className="rounded bg-amber-50/80 p-1">
                      <span className="text-[10px] font-bold text-amber-700">SNT</span>
                      <p className="text-xs font-black text-slate-800">{w.sntHours}h</p>
                    </div>
                    <div className="rounded bg-purple-50/80 p-1">
                      <span className="text-[10px] font-bold text-purple-700">TRD</span>
                      <p className="text-xs font-black text-slate-800">{w.trdHours}h</p>
                    </div>
                  </div>

                  <div className="mt-2 text-center text-[11px] font-bold text-[#0b4f8a]">
                    {isSelected ? "● Viewing Tasks" : "Click to view tasks"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section-Scoped Scheduled Task Drilldown */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="bg-[#0b4f8a] px-4 py-2.5 text-white flex items-center justify-between">
            <span className="text-xs font-extrabold font-railway uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-400" />
              <span>
                {activeWeekData.label} — {CORRIDOR_SECTIONS.find((s) => s.id === activeSectionFilter)?.name} ({activeWeekData.blocks.length} Tasks)
              </span>
            </span>
            <span className="text-[11px] font-mono text-blue-100">
              Click any task to run FMEA & ML Risk Analysis
            </span>
          </div>

          {activeWeekData.blocks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No maintenance possession blocks assigned for this section in {activeWeekData.label}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {activeWeekData.blocks.map((blk) => {
                const isBlockSelected = selectedBlockId === blk.id;
                const primaryJob = blk.jobs[0];

                return (
                  <div
                    key={blk.id}
                    onClick={() => onSelectBlock(blk.id, primaryJob?.id)}
                    className={`cursor-pointer p-3.5 flex items-center justify-between transition ${
                      isBlockSelected
                        ? "bg-blue-50 border-l-4 border-[#0b4f8a]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {blk.departments.map((dept) => (
                          <span
                            key={dept}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              dept === "ENG"
                                ? "bg-blue-600 text-white"
                                : dept === "SNT"
                                ? "bg-amber-600 text-white"
                                : "bg-purple-600 text-white"
                            }`}
                          >
                            {dept}
                          </span>
                        ))}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-900 font-railway flex items-center gap-2">
                          <span className="font-mono text-[#0b4f8a] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {primaryJob?.id || blk.id}
                          </span>
                          <span>{primaryJob?.title || blk.title}</span>
                          {blk.is_bundled && (
                            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 rounded">
                              BUNDLED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          Section: <span className="font-bold text-slate-700">{blk.section_id}</span> • Asset: {primaryJob?.asset_id || "TRK"} • {new Date(blk.start_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {new Date(blk.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {primaryJob?.duration_mins || 150} mins
                      </span>
                      <ChevronRight className={`h-4 w-4 ${isBlockSelected ? "text-[#0b4f8a]" : "text-slate-400"}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};