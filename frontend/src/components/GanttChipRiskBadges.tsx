// frontend/src/components/GanttChipRiskBadges.tsx
import { Radio, Wrench, Zap } from "lucide-react";

export type Department = "ENG" | "SNT" | "TRD";

export type DualRiskBadgeProps = {
  fmea: number;
  ml: number;
  showBreakdown?: boolean;
  className?: string;
};

export type GanttChipProps = {
  blockId: string;
  sectionName: string;
  departments: Department[];
  startTime: string | Date;
  endTime: string | Date;
  isBundled?: boolean;
  className?: string;
  onClick?: () => void;
};

const departmentStyles: Record<Department, string> = {
  ENG: "bg-[#0284C7]",
  SNT: "bg-[#D97706]",
  TRD: "bg-[#7C3AED]",
};

function riskLabel(score: number): string {
  if (score > 65) {
    return "High";
  }
  if (score >= 30) {
    return "Moderate";
  }
  return "Low";
}

function riskStyle(score: number): string {
  if (score > 65) {
    return "bg-rose-100 text-rose-800 ring-rose-200";
  }
  if (score >= 30) {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }
  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

function formatWindowTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function durationHours(startTime: string | Date, endTime: string | Date): string {
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  return `${(durationMs / (60 * 60 * 1000)).toFixed(1)}h`;
}

function DepartmentIcons({ departments }: { departments: Department[] }) {
  return (
    <span className="inline-flex items-center" aria-hidden="true">
      {departments.includes("ENG") && <Wrench className="mr-0.5 h-3 w-3" />}
      {departments.includes("SNT") && <Radio className="mr-0.5 h-3 w-3" />}
      {departments.includes("TRD") && <Zap className="mr-0.5 h-3 w-3" />}
    </span>
  );
}

export function DualRiskBadge({
  fmea,
  ml,
  showBreakdown = true,
  className = "",
}: DualRiskBadgeProps) {
  const combinedRisk = (fmea + ml) / 2;
  const label = riskLabel(combinedRisk);

  return (
    <div
      className={`group relative inline-flex flex-col items-start ${className}`}
      title={`FMEA: ${fmea.toFixed(1)} | ML: ${ml.toFixed(1)}`}
    >
      <span
        className={`rounded-full px-2.5 py-1 text-sm font-bold ring-1 ${riskStyle(
          combinedRisk,
        )}`}
      >
        {combinedRisk.toFixed(1)} {label}
      </span>

      {showBreakdown && (
        <span className="mt-1 inline-flex rounded-sm bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-500">
          FMEA: {fmea.toFixed(1)} | ML: {ml.toFixed(1)}
        </span>
      )}

      {!showBreakdown && (
        <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-max rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          FMEA: {fmea.toFixed(1)} | ML: {ml.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export function WeeklyInspectorRisk({
  fmea,
  ml,
}: {
  fmea: number;
  ml: number;
}) {
  return (
    <section className="border-l-4 border-[#0F172A] pl-4">
      <p className="text-sm font-medium text-slate-600">Risk assessment</p>
      <DualRiskBadge fmea={fmea} ml={ml} className="mt-2" />
    </section>
  );
}

export function MonthlyTaskRisk({
  fmea,
  ml,
}: {
  fmea: number;
  ml: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-slate-600">Risk</span>
      <DualRiskBadge fmea={fmea} ml={ml} showBreakdown={false} />
    </div>
  );
}

export function WeeklyGanttChip({
  blockId,
  sectionName,
  departments,
  startTime,
  endTime,
  isBundled = false,
  className = "",
  onClick,
}: GanttChipProps) {
  const primaryDepartment = departments[0] ?? "ENG";
  const displayDepartment =
    departments.length > 1 ? departments.join("+") : primaryDepartment;
  const timeWindow = `${formatWindowTime(startTime)} - ${formatWindowTime(
    endTime,
  )} IST`;
  const tooltip = [
    `Block ID: ${blockId}`,
    `Section: ${sectionName}`,
    `Department${departments.length > 1 ? "s" : ""}: ${departments.join(", ")}`,
    `Window: ${timeWindow}`,
  ].join("\n");

  return (
    <button
      type="button"
      title={tooltip}
      onClick={onClick}
      aria-label={tooltip.replaceAll("\n", ", ")}
      className={`flex h-full min-w-0 cursor-pointer items-center gap-1 rounded-sm px-2 text-xs font-semibold text-white transition hover:brightness-110 ${
        departmentStyles[primaryDepartment]
      } ${
        isBundled
          ? "bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.2)_0px,rgba(255,255,255,0.2)_6px,transparent_6px,transparent_12px)]"
          : ""
      } ${className}`}
    >
      <DepartmentIcons departments={departments} />
      <span className="truncate">
        {displayDepartment} · {durationHours(startTime, endTime)}
      </span>
    </button>
  );
}