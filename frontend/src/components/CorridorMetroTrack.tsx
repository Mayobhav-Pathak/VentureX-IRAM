// frontend/src/components/CorridorMetroTrack.tsx
import React, { useMemo } from "react";

export interface MetroSection {
  id: string;
  name: string;
  fromStation: string;
  toStation: string;
  startKm: number;
  endKm: number;
}

export const CORRIDOR_METRO_DATA: MetroSection[] = [
  { id: "NDLS-TKD", name: "New Delhi - Tuglakabad", fromStation: "NDLS", toStation: "TKD", startKm: 0.0, endKm: 17.5 },
  { id: "TKD-FDB", name: "Tuglakabad - Faridabad", fromStation: "TKD", toStation: "FDB", startKm: 17.5, endKm: 37.8 },
  { id: "FDB-PWL", name: "Faridabad - Palwal", fromStation: "FDB", toStation: "PWL", startKm: 37.8, endKm: 60.2 },
  { id: "PWL-KSV", name: "Palwal - Kosi Kalan", fromStation: "PWL", toStation: "KSV", startKm: 60.2, endKm: 102.5 },
  { id: "KSV-MTJ", name: "Kosi Kalan - Mathura", fromStation: "KSV", toStation: "MTJ", startKm: 102.5, endKm: 149.8 },
  { id: "MTJ-AGC", name: "Mathura - Agra Cantt", fromStation: "MTJ", toStation: "AGC", startKm: 149.8, endKm: 199.3 },
];

interface Props {
  selectedSectionId?: string;
  onSelectSection?: (id: string) => void;
  blocks?: Array<{ section_id: string; is_conflict?: boolean }>;
}

export const CorridorMetroTrack: React.FC<Props> = ({ selectedSectionId, onSelectSection, blocks = [] }) => {
  // Dynamically count blocks and check conflicts per section
  const sectionStats = useMemo(() => {
    const stats: Record<string, { count: number; hasConflict: boolean }> = {};
    for (const sec of CORRIDOR_METRO_DATA) {
      stats[sec.id] = { count: 0, hasConflict: false };
    }
    for (const b of blocks) {
      if (stats[b.section_id]) {
        stats[b.section_id].count += 1;
        if (b.is_conflict) {
          stats[b.section_id].hasConflict = true;
        }
      }
    }
    return stats;
  }, [blocks]);

  return (
    <div className="w-64 shrink-0 border-r border-slate-200 bg-[#f8fafc] flex flex-col select-none">
      {/* 45px Sticky Header */}
      <div className="h-11.25 border-b border-slate-200 bg-slate-100/90 px-3 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block leading-tight font-railway">
            CORRIDOR TOPOLOGY
          </span>
          <h4 className="text-[11px] font-black text-[#0b4f8a] uppercase tracking-wide leading-tight">
            NDLS ➔ AGC MAIN TRUNK
          </h4>
        </div>
        <span className="text-[9px] font-mono font-bold bg-[#0b4f8a] text-white px-1.5 py-0.5 rounded">
          199.3 KM
        </span>
      </div>

      {/* Connected Line Stations */}
      <div className="flex flex-col divide-y divide-slate-100">
        {CORRIDOR_METRO_DATA.map((sec, idx) => {
          const isSelected = selectedSectionId === sec.id;
          const isLast = idx === CORRIDOR_METRO_DATA.length - 1;
          const count = sectionStats[sec.id]?.count ?? 0;
          const hasConflict = sectionStats[sec.id]?.hasConflict ?? false;

          return (
            <div
              key={sec.id}
              onClick={() => onSelectSection?.(sec.id)}
              className={`group relative flex h-21 cursor-pointer items-center px-3 transition ${
                isSelected
                  ? "bg-white shadow-sm ring-1 ring-inset ring-[#0b4f8a]"
                  : "hover:bg-slate-200/40"
              }`}
            >
              {/* Metro Rail Line Graphic */}
              <div className="relative flex flex-col items-center mr-3 w-4 h-full shrink-0">
                <div className={`w-0.5 flex-1 ${idx === 0 ? "opacity-0" : "bg-slate-300 group-hover:bg-[#0b4f8a]/50"}`} />
                <div
                  className={`relative z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 transition ${
                    hasConflict
                      ? "border-rose-600 bg-rose-500 animate-pulse ring-2 ring-rose-200"
                      : isSelected
                      ? "border-[#0b4f8a] bg-[#f37021] ring-2 ring-orange-200"
                      : "border-slate-400 bg-white group-hover:border-[#0b4f8a]"
                  }`}
                >
                  <div className="h-1 w-1 rounded-full bg-white" />
                </div>
                <div className={`w-0.5 flex-1 ${isLast ? "opacity-0" : "bg-slate-300 group-hover:bg-[#0b4f8a]/50"}`} />
              </div>

              {/* Station Information */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-railway text-xs font-bold text-slate-900 truncate leading-tight">
                    {sec.name}
                  </span>
                  {hasConflict && (
                    <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-500">
                  <span className="font-bold text-[#0b4f8a]">{sec.fromStation}→{sec.toStation}</span>
                  <span>•</span>
                  <span>KM {sec.startKm}–{sec.endKm}</span>
                </div>

                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700">
                    {count} {count === 1 ? "Block" : "Blocks"} Active
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};