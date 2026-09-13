// frontend/src/components/CorridorMetroTrack.tsx
import React from "react";

export interface MetroSection {
  id: string;
  name: string;
  fromStation: string;
  toStation: string;
  startKm: number;
  endKm: number;
  activePossessions: number;
  hasConflict?: boolean;
}

export const CORRIDOR_METRO_DATA: MetroSection[] = [
  { id: "NDLS-TKD", name: "New Delhi - Tuglakabad", fromStation: "NDLS", toStation: "TKD", startKm: 0.0, endKm: 17.5, activePossessions: 4 },
  { id: "TKD-FDB", name: "Tuglakabad - Faridabad", fromStation: "TKD", toStation: "FDB", startKm: 17.5, endKm: 37.8, activePossessions: 3 },
  { id: "FDB-PWL", name: "Faridabad - Palwal", fromStation: "FDB", toStation: "PWL", startKm: 37.8, endKm: 60.2, activePossessions: 3 },
  { id: "PWL-KSV", name: "Palwal - Kosi Kalan", fromStation: "PWL", toStation: "KSV", startKm: 60.2, endKm: 102.5, activePossessions: 2 },
  { id: "KSV-MTJ", name: "Kosi Kalan - Mathura", fromStation: "KSV", toStation: "MTJ", startKm: 102.5, endKm: 149.8, activePossessions: 3 },
  { id: "MTJ-AGC", name: "Mathura - Agra Cantt", fromStation: "MTJ", toStation: "AGC", startKm: 149.8, endKm: 199.3, activePossessions: 5, hasConflict: true },
];

interface Props {
  selectedSectionId?: string;
  onSelectSection?: (id: string) => void;
}

export const CorridorMetroTrack: React.FC<Props> = ({ selectedSectionId, onSelectSection }) => {
  return (
    <div className="w-64 shrink-0 border-r border-slate-200 bg-[#f8fafc] flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-railway">
            CORRIDOR TOPOLOGY
          </span>
          <h4 className="text-xs font-black text-[#0b4f8a] font-railway-condensed uppercase tracking-wider">
            NDLS ➔ AGC MAIN TRUNK
          </h4>
        </div>
        <span className="text-[10px] font-mono font-bold bg-[#0b4f8a] text-white px-1.5 py-0.5 rounded">
          199.3 KM
        </span>
      </div>

      {/* Connected Line Stations */}
      <div className="p-3 flex flex-col justify-between flex-1">
        {CORRIDOR_METRO_DATA.map((sec, idx) => {
          const isSelected = selectedSectionId === sec.id;
          const isLast = idx === CORRIDOR_METRO_DATA.length - 1;

          return (
            <div
              key={sec.id}
              onClick={() => onSelectSection?.(sec.id)}
              className={`group relative flex cursor-pointer items-stretch rounded-lg p-2.5 transition ${
                isSelected
                  ? "bg-white shadow-md ring-1 ring-[#0b4f8a]"
                  : "hover:bg-slate-200/50"
              }`}
              style={{ minHeight: "82px" }}
            >
              {/* Rail Line Graphic */}
              <div className="relative flex flex-col items-center mr-3 w-5 shrink-0">
                {/* Upper Track Connector Line */}
                <div className={`w-0.75 flex-1 ${idx === 0 ? "opacity-0" : "bg-slate-300 group-hover:bg-[#0b4f8a]/50"}`} />

                {/* Station Node Point */}
                <div
                  className={`relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 transition ${
                    sec.hasConflict
                      ? "border-rose-600 bg-rose-500 animate-pulse ring-4 ring-rose-200"
                      : isSelected
                      ? "border-[#0b4f8a] bg-[#f37021] ring-2 ring-orange-200"
                      : "border-slate-400 bg-white group-hover:border-[#0b4f8a]"
                  }`}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                </div>

                {/* Lower Track Connector Line */}
                <div className={`w-0.75 flex-1 ${isLast ? "opacity-0" : "bg-slate-300 group-hover:bg-[#0b4f8a]/50"}`} />
              </div>

              {/* Station & Section Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-railway text-sm font-bold text-slate-900 truncate leading-tight">
                    {sec.name}
                  </span>
                  {sec.hasConflict && (
                    <span className="shrink-0 h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500">
                  <span className="font-bold text-[#0b4f8a]">{sec.fromStation}→{sec.toStation}</span>
                  <span>•</span>
                  <span>KM {sec.startKm}–{sec.endKm}</span>
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                    {sec.activePossessions} Blocks Active
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