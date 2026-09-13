// frontend/src/components/GanttRiskComponents.tsx
import { Radio, Wrench, Zap } from "lucide-react";

export type Department = "ENG" | "SNT" | "TRD";

export type GanttBlock = {
  id: string;
  title: string;
  duration_mins: number;
  departments: Department[];
  is_bundled: boolean;
};

export type RiskScoreDisplayProps = {
  fmea: number;
  ml: number;
  className?: string;
};

const departmentColor: Record<Department, string> = {
  ENG: "bg-[#0284C7]",
  SNT: "bg-[#D97706]",
  TRD: "bg-[#7C3AED]",
};

function riskSignalClass(score: number): string {
  if (score > 65) {
    return "bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.6)]";
  }
  if (score >= 30) {
    return "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]";
  }
  return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]";
}

export function DepartmentGlyphs({
  departments,
}: {
  departments: Department[];
}) {
  return (
    <span className="inline-flex shrink-0 items-center" aria-hidden="true">
      {departments.includes("ENG") && <Wrench className="mr-1 h-3 w-3" />}
      {departments.includes("SNT") && <Radio className="mr-1 h-3 w-3" />}
      {departments.includes("TRD") && <Zap className="mr-1 h-3 w-3" />}
    </span>
  );
}

export function RiskScoreDisplay({
  fmea,
  ml,
  className = "",
}: RiskScoreDisplayProps) {
  const combinedRisk = (fmea + ml) / 2;
  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <span className="inline-flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${riskSignalClass(combinedRisk)}`} />
        <span className="font-mono text-xl font-bold tabular-nums text-[#0F172A]">
          {combinedRisk.toFixed(1)}
        </span>
      </span>
      <span className="mt-1 rounded-sm bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-500">
        FMEA: {fmea.toFixed(1)} · ML: {ml.toFixed(1)}
      </span>
    </div>
  );
}

export function GanttBlockChip({
  block,
  isSelected = false,
  onClick,
}: {
  block: GanttBlock;
  isSelected?: boolean;
  onClick?: (blockId: string) => void;
}) {
  const primaryDepartment = block.departments[0] ?? "ENG";
  return (
    <button
      type="button"
      onClick={() => onClick?.(block.id)}
      aria-label={`${block.title}, ${block.departments.join(" plus ")}, ${block.duration_mins} minutes`}
      className={`flex h-full min-w-0 cursor-pointer items-center rounded-sm px-2 text-left text-xs font-semibold text-white transition ${
        departmentColor[primaryDepartment]
      } ${
        block.is_bundled
          ? "bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.18)_0px,rgba(255,255,255,0.18)_6px,transparent_6px,transparent_12px)]"
          : ""
      } ${
        isSelected
          ? "ring-2 ring-[#0F172A] ring-offset-1"
          : "hover:brightness-110"
      }`}
    >
      <DepartmentGlyphs departments={block.departments} />
      <span className="truncate">{block.title}</span>
      <span className="ml-auto shrink-0 pl-2 font-mono text-[10px] text-white/90">
        {block.duration_mins}m
      </span>
    </button>
  );
}

export function EmptyTrackSlot() {
  return (
    <div
      aria-label="No scheduled maintenance"
      className="h-full min-h-12 rounded-sm border border-dashed border-slate-200 bg-slate-50/40"
    />
  );
}

export function WeeklyInspectorRisk({
  fmeaScore,
  mlRiskScore,
}: {
  fmeaScore: number;
  mlRiskScore: number;
}) {
  return (
    <section className="border-l-4 border-[#0F172A] pl-4">
      <p className="text-sm font-medium text-slate-600">Risk assessment</p>
      <div className="mt-2">
        <RiskScoreDisplay fmea={fmeaScore} ml={mlRiskScore} />
      </div>
    </section>
  );
}

export function MonthlyTaskRisk({
  fmeaScore,
  mlRiskScore,
}: {
  fmeaScore: number;
  mlRiskScore: number;
}) {
  return (
    <div className="border-t border-slate-200 pt-3">
      <p className="mb-2 text-sm font-medium text-slate-600">Risk assessment</p>
      <RiskScoreDisplay fmea={fmeaScore} ml={mlRiskScore} />
    </div>
  );
}