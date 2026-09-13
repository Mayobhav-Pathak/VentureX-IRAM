import { Gauge, MapPin, RadioTower, Wrench, Zap } from "lucide-react";

export type Department = "ENG" | "SNT" | "TRD";

export type CorridorSection = {
  id: string;
  name: string;
  backlogSeverityIndex: number;
  department?: Department;
};

export type CorridorSectionListProps = {
  sections: CorridorSection[];
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
};

const departmentStyle: Record<
  Department,
  {
    label: string;
    color: string;
    icon: typeof Wrench;
  }
> = {
  ENG: {
    label: "Engineering",
    color: "text-[#0284C7]",
    icon: Wrench,
  },
  SNT: {
    label: "Signal & Telecom",
    color: "text-[#D97706]",
    icon: RadioTower,
  },
  TRD: {
    label: "Traction Distribution",
    color: "text-[#7C3AED]",
    icon: Zap,
  },
};

function signalAspectClass(severity: number): string {
  if (severity > 65) {
    return "bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.6)]";
  }
  if (severity >= 30) {
    return "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]";
  }
  return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]";
}

function SignalAspect({ severity }: { severity: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${signalAspectClass(severity)}`}
        aria-label={`Backlog severity ${severity}`}
      />
      <span className="font-mono text-xs font-semibold tabular-nums text-[#1E293B]">
        {severity.toFixed(0)}
      </span>
    </span>
  );
}

export default function CorridorSectionList({
  sections,
  selectedSectionId,
  onSelectSection,
}: CorridorSectionListProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[#0F172A] px-5 py-4">
        <p className="text-sm font-semibold text-white">Corridor sections</p>
        <p className="mt-1 text-xs text-slate-300">
          Delhi–Agra operational schematic
        </p>
      </div>

      <div className="relative">
        <div className="absolute bottom-0 left-6.25 top-0 w-0.5 bg-slate-300" />

        {sections.map((section, index) => {
          const isSelected = selectedSectionId === section.id;
          const details = section.department
            ? departmentStyle[section.department]
            : null;
          const DepartmentIcon = details?.icon ?? Gauge;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection?.(section.id)}
              className={`relative flex w-full cursor-pointer items-center gap-4 border-b border-slate-200 px-5 py-4 text-left transition last:border-b-0 ${
                isSelected ? "bg-slate-100 ring-2 ring-inset ring-blue-500/40" : "bg-white hover:bg-slate-50"
              }`}
            >
              <span className="relative z-10 flex w-3 justify-center">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-700 bg-white" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#0F172A]">
                  {section.name}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {section.id}
                </span>
              </span>

              <span className="flex items-center gap-3">
                {details && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${details.color}`}
                    title={details.label}
                  >
                    <DepartmentIcon className="h-4 w-4" />
                    {section.department}
                  </span>
                )}
                <SignalAspect severity={section.backlogSeverityIndex} />
              </span>

              {index === 0 && (
                <MapPin className="absolute -left-0.5 top-2 h-3.5 w-3.5 text-[#D97706]" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}