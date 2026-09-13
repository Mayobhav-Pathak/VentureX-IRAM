import { AlertTriangle, X } from "lucide-react";
import { useMemo, useState } from "react";

export type ScheduleBlock = {
  id: string;
  section_id: string;
  start_time: string;
  end_time: string;
  department_list: string[];
  is_bundled: boolean;
  is_conflict: boolean;
  title: string;
};

type ConflictScheduleProps = {
  initialBlocks: ScheduleBlock[];
  onConflictResolved?: () => void;
};

export type ResolveAction = "bundle" | "reschedule" | "override";

export default function ConflictSchedule({
  initialBlocks,
  onConflictResolved,
}: ConflictScheduleProps) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(initialBlocks);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeConflictsCount = useMemo(
    () => blocks.filter((block) => block.is_conflict).length,
    [blocks],
  );

  const selectedConflict = useMemo(
    () =>
      blocks.find((block) => block.id === selectedConflictId) ??
      blocks.find((block) => block.is_conflict) ??
      null,
    [blocks, selectedConflictId],
  );

  const openConflict = (blockId?: string) => {
    const conflict =
      blocks.find((block) => block.id === blockId && block.is_conflict) ??
      blocks.find((block) => block.is_conflict);
    if (conflict) {
      setError(null);
      setSelectedConflictId(conflict.id);
    }
  };

  const resolveConflict = async (action: ResolveAction) => {
    if (!selectedConflict) return;

    setIsResolving(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/conflicts/${encodeURIComponent(selectedConflict.id)}/resolve`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ action }),
        },
      );

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || `Server error: ${response.status}`);
      }

      const updatedBlock: ScheduleBlock = await response.json();

      setBlocks((currentBlocks) =>
        currentBlocks
          .filter((b) => action !== "bundle" || !b.id.includes("ENG-9901"))
          .map((block) =>
            block.id === updatedBlock.id ? { ...block, ...updatedBlock } : block,
          ),
      );

      setSelectedConflictId(null);
      onConflictResolved?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to resolve conflict",
      );
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => openConflict()}
          disabled={activeConflictsCount === 0}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold transition cursor-pointer ${
            activeConflictsCount > 0
              ? "bg-red-100 text-red-800 ring-1 ring-red-300 hover:bg-red-200 animate-pulse"
              : "cursor-default bg-slate-100 text-slate-500"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          {activeConflictsCount} Pending{" "}
          {activeConflictsCount === 1 ? "Conflict" : "Conflicts"}
        </button>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        {blocks.map((block) => (
          <button
            key={block.id}
            type="button"
            onClick={() => {
              if (block.is_conflict) {
                openConflict(block.id);
              }
            }}
            className={`flex w-full cursor-pointer items-center justify-between rounded-lg border p-3 text-left transition ${
              block.is_conflict
                ? "border-red-600 bg-[repeating-linear-gradient(135deg,#fef2f2_0px,#fef2f2_7px,#fecaca_7px,#fecaca_14px)] ring-2 ring-red-300 hover:ring-red-500"
                : block.is_bundled
                ? "border-violet-300 bg-[repeating-linear-gradient(135deg,#f5f3ff_0px,#f5f3ff_7px,#ddd6fe_7px,#ddd6fe_14px)]"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900">{block.title}</p>
              <p className="text-xs text-slate-500">
                {block.section_id} · {block.department_list.join(" + ")}
              </p>
            </div>
            {block.is_conflict && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white shadow">
                <AlertTriangle className="h-3.5 w-3.5" />
                Resolve
              </span>
            )}
            {block.is_bundled && (
              <span className="rounded-full bg-violet-700 px-2 py-1 text-xs font-bold text-white">
                Bundled
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-red-700">
                  Departmental Possession Conflict
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedConflict.section_id}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedConflict.department_list.join(" and ")} requested
                  the same 180-minute window.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConflictId(null)}
                className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                disabled={isResolving}
                onClick={() => resolveConflict("bundle")}
                className="cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isResolving ? "Resolving..." : "Bundle Together"}
              </button>
              <button
                type="button"
                disabled={isResolving}
                onClick={() => resolveConflict("reschedule")}
                className="cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
              >
                Push SNT to Next Window
              </button>
              <button
                type="button"
                disabled={isResolving}
                onClick={() => resolveConflict("override")}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Manual Override
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}