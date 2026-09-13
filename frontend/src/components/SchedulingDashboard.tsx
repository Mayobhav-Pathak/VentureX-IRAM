import { useMemo, useState } from "react";
import Timeline, {
  DateHeader,
} from "react-calendar-timeline";
import type { TimelineGroupBase, TimelineItemBase } from "react-calendar-timeline";
import "react-calendar-timeline/style.css";

type Department = "ENG" | "SNT" | "TRD";

type ScheduleGroup = TimelineGroupBase & {
  id: string;
  title: string;
};

type ScheduleItem = Omit<
  TimelineItemBase<number>,
  "start_time" | "end_time"
> & {
  id: string;
  group: string;
  start_time: string;
  end_time: string;
  department: Department;
  priority_score: number;
};

type SchedulingDashboardProps = {
  groups: ScheduleGroup[];
  items: ScheduleItem[];
};

const departmentColors: Record<Department, string> = {
  ENG: "#2563eb",
  SNT: "#7c3aed",
  TRD: "#ea580c",
};

async function reoptimizeSchedule(
  draggedItemId: string,
  newStartTime: string,
): Promise<void> {
  // In the future, this will make a fetch/axios call to your FastAPI backend
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log({ draggedItemId, newStartTime });
}

export default function SchedulingDashboard({
  groups,
  items,
}: SchedulingDashboardProps) {
  const [scheduledItems, setScheduledItems] = useState(items);

  const bundledKeys = useMemo(() => {
    const counts = new Map<string, number>();
    scheduledItems.forEach((item) => {
      const key = `${item.group}|${item.start_time}|${item.end_time}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([key]) => key),
    );
  }, [scheduledItems]);

  const timelineItems = useMemo(
    () =>
      scheduledItems.map((item) => {
        // FIXED: Added backticks around the template string
        const bundleKey = `${item.group}|${item.start_time}|${item.end_time}`;
        const isBundled = bundledKeys.has(bundleKey);
        
        return {
          ...item,
          group: item.group,
          start_time: new Date(item.start_time).getTime(),
          end_time: new Date(item.end_time).getTime(),
          title: `${item.department} · Priority ${item.priority_score}`,
          itemProps: {
            style: {
              background: isBundled
                ? `repeating-linear-gradient(
                    45deg,
                    ${departmentColors[item.department]},
                    ${departmentColors[item.department]} 8px,
                    rgba(255, 255, 255, 0.28) 8px,
                    rgba(255, 255, 255, 0.28) 12px
                  )`
                : departmentColors[item.department],
              border: "none",
              borderRadius: "6px",
              color: "#ffffff",
            },
          },
        };
      }),
    [bundledKeys, scheduledItems],
  );

  const handleItemMove = async (
    itemId: string | number,
    dragTime: number,
    newGroupOrder: number,
  ) => {
    const movedItem = scheduledItems.find((item) => item.id === String(itemId));
    
    if (!movedItem) {
      return;
    }

    const duration =
      new Date(movedItem.end_time).getTime() -
      new Date(movedItem.start_time).getTime();
    const newStart = new Date(dragTime);
    const newEnd = new Date(dragTime + duration);
    const newGroup = groups[newGroupOrder];

    setScheduledItems((currentItems) =>
      currentItems.map((item) =>
        item.id === String(itemId)
          ? {
              ...item,
              group: String(newGroup.id),
              start_time: newStart.toISOString(),
              end_time: newEnd.toISOString(),
            }
          : item,
      ),
    );

    await reoptimizeSchedule(String(itemId), newStart.toISOString());
  };

  const visibleTimeStart = useMemo(() => Date.now(), []);
  const visibleTimeEnd = useMemo(
    () => visibleTimeStart + 7 * 24 * 60 * 60 * 1000,
    [visibleTimeStart],
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Maintenance Schedule
          </h2>
          <p className="text-sm text-slate-500">7-day rolling horizon</p>
        </div>
        <div className="flex gap-3 text-xs font-medium">
          {Object.entries(departmentColors).map(([department, color]) => (
            <span key={department} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              {department}
            </span>
          ))}
        </div>
      </div>
      
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Timeline
          groups={groups}
          items={timelineItems}
          defaultTimeStart={visibleTimeStart}
          defaultTimeEnd={visibleTimeEnd}
          minZoom={7 * 24 * 60 * 60 * 1000}
          maxZoom={7 * 24 * 60 * 60 * 1000}
          canMove
          canResize={false}
          onItemMove={handleItemMove}
          itemRenderer={({ item, getItemProps, getResizeProps }) => {
            const originalItem = scheduledItems.find(
              (scheduledItem) => scheduledItem.id === String(item.id),
            );
            const bundleKey = originalItem
              ? `${originalItem.group}|${originalItem.start_time}|${originalItem.end_time}`
              : "";
            const isBundled = bundledKeys.has(bundleKey);

            return (
              <div
                {...getItemProps({
                  className:
                    "flex h-full items-center gap-1 overflow-hidden px-2 text-xs font-semibold",
                })}
              >
                <div {...getResizeProps().left} />
                <span className="truncate">{item.title as string}</span>
                {isBundled && (
                  <span className="ml-auto rounded bg-white/25 px-1 py-0.5 text-[10px]">
                    Bundled
                  </span>
                )}
                <div {...getResizeProps().right} />
              </div>
            );
          }}
        >
          <DateHeader unit="primaryHeader" />
          <DateHeader />
        </Timeline>
      </div>
    </section>
  );
}