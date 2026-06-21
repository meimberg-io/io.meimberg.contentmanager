"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { weekStartOf, ymdInZone } from "@/lib/schedule-time";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, SkipForward, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_TZ,
  TYP_LABEL,
  timeToMinutes,
  isLive,
  entryHref,
  moveInstance,
  trackColor,
  type PlanInstance,
  type PlanSchedule,
} from "@/lib/scheduler/plan-view";

const pad2 = (n: number) => String(n).padStart(2, "0");
const MONTH_LABEL = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAY_HEADERS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MAX_CHIPS_PER_DAY = 3;

/** A planned entry flattened across all tracks, tagged with its track colour. */
interface CalEntry {
  inst: PlanInstance;
  scheduleId: string;
  scheduleName: string;
  colorIndex: number;
}

interface DayCell {
  ymd: string;
  day: number;
  inMonth: boolean;
  jsWeekday: number; // 0 = Sun … 6 = Sat (matches Slot.weekday)
  isToday: boolean;
  entries: CalEntry[];
}

function statusIcon(inst: PlanInstance, dotClass: string) {
  if (!inst.exists || inst.status === "failed")
    return <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-red-400" />;
  if (inst.status === "published") return <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-green-500" />;
  if (inst.status === "skipped") return <SkipForward className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />;
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />;
}

function CalChip({ entry, onRemove }: { entry: CalEntry; onRemove: (storyUuid: string) => void }) {
  const draggable = isLive(entry.inst);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.inst.instanceId,
    disabled: !draggable,
  });
  const router = useRouter();
  const color = trackColor(entry.colorIndex);
  const href = entryHref(entry.inst);
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 };
  const dimmed = !entry.inst.exists || entry.inst.status === "skipped";
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      onClick={() => {
        if (href) router.push(href);
      }}
      title={`${TYP_LABEL[entry.inst.typ]} · ${entry.scheduleName}: ${entry.inst.title}`}
      className={`group/chip flex items-center gap-1 rounded border px-1 py-0.5 text-[10px] leading-tight ${color.chip} ${
        draggable ? "cursor-grab active:cursor-grabbing" : href ? "cursor-pointer" : "cursor-default"
      } ${dimmed ? "opacity-60" : ""}`}
    >
      {statusIcon(entry.inst, color.dot)}
      <span className="min-w-0 flex-1 truncate">{entry.inst.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(entry.inst.storyUuid);
        }}
        title="Aus dem Plan nehmen"
        className="hidden shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground/70 hover:bg-red-600 hover:text-white group-hover/chip:block"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function DayCell({
  cell,
  dragActive,
  isValidTarget,
  onRemove,
}: {
  cell: DayCell;
  dragActive: boolean;
  isValidTarget: boolean;
  onRemove: (storyUuid: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cell.ymd, disabled: !cell.inMonth });
  const shown = cell.entries.slice(0, MAX_CHIPS_PER_DAY);
  const extra = cell.entries.length - shown.length;

  const highlight =
    isOver && isValidTarget
      ? "border-emerald-400 ring-2 ring-emerald-400/40"
      : dragActive && isValidTarget
        ? "border-emerald-400/50 bg-emerald-500/5"
        : cell.isToday
          ? "border-blue-400/50 ring-1 ring-blue-400/40"
          : "border-border/40";

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[88px] flex-col gap-0.5 rounded-lg border p-1 transition-colors ${
        cell.inMonth ? highlight : "border-transparent opacity-40"
      }`}
    >
      <div
        className={`px-0.5 text-[10px] font-medium tabular-nums ${
          cell.isToday ? "text-blue-400" : "text-muted-foreground"
        }`}
      >
        {cell.day}
      </div>
      {shown.map((entry) => (
        <CalChip key={entry.inst.instanceId} entry={entry} onRemove={onRemove} />
      ))}
      {extra > 0 && (
        <div
          className="px-1 text-[9px] text-muted-foreground"
          title={cell.entries
            .slice(MAX_CHIPS_PER_DAY)
            .map((e) => `${e.scheduleName}: ${e.inst.title}`)
            .join("\n")}
        >
          +{extra} weitere
        </div>
      )}
    </div>
  );
}

export function ScheduleCalendarView({
  schedules,
  onReload,
  onRemove,
}: {
  schedules: PlanSchedule[];
  onReload: () => void;
  onRemove: (storyUuid: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const [anchor, setAnchor] = useState(() => {
    const [y, m] = ymdInZone(new Date(), DEFAULT_TZ).split("-").map(Number);
    return { year: y, month: m };
  });
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);

  const todayYmd = ymdInZone(new Date(), DEFAULT_TZ);
  const scheduleById = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules]);

  // instanceId → its schedule (covers placed + orphaned instances, for drag).
  const scheduleByInstance = useMemo(() => {
    const m = new Map<string, string>();
    for (const sched of schedules) for (const inst of sched.instances) m.set(inst.instanceId, sched.id);
    return m;
  }, [schedules]);

  const calEntries = useMemo<CalEntry[]>(
    () =>
      schedules.flatMap((sched, idx) =>
        sched.instances
          .filter((inst) => !inst.isOrphan && inst.date)
          .map((inst) => ({ inst, scheduleId: sched.id, scheduleName: sched.name, colorIndex: idx })),
      ),
    [schedules],
  );

  const orphans = useMemo<CalEntry[]>(
    () =>
      schedules.flatMap((sched, idx) =>
        sched.instances
          .filter((inst) => inst.isOrphan)
          .map((inst) => ({ inst, scheduleId: sched.id, scheduleName: sched.name, colorIndex: idx })),
      ),
    [schedules],
  );

  const cells = useMemo<DayCell[]>(() => {
    const { year, month } = anchor;
    const byYmd = new Map<string, CalEntry[]>();
    for (const e of calEntries) {
      const ymd = ymdInZone(new Date(e.inst.date!), DEFAULT_TZ);
      const arr = byYmd.get(ymd);
      if (arr) arr.push(e);
      else byYmd.set(ymd, [e]);
    }
    for (const arr of byYmd.values()) arr.sort((a, b) => (a.inst.date! < b.inst.date! ? -1 : a.inst.date! > b.inst.date! ? 1 : 0));

    const firstWeekdayJs = new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay();
    const mondayOffset = (firstWeekdayJs + 6) % 7; // 0 when the 1st is a Monday
    const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
    const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
    const gridStart = Date.UTC(year, month - 1, 1 - mondayOffset, 12);

    const out: DayCell[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(gridStart + i * 86_400_000);
      const y = d.getUTCFullYear();
      const mo = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      const ymd = `${y}-${pad2(mo)}-${pad2(day)}`;
      out.push({
        ymd,
        day,
        inMonth: mo === month && y === year,
        jsWeekday: d.getUTCDay(),
        isToday: ymd === todayYmd,
        entries: byYmd.get(ymd) ?? [],
      });
    }
    return out;
  }, [anchor, calEntries, todayYmd]);

  // Weekdays the dragged entry's track has a slot on — drives the valid-target highlight.
  const activeWeekdays = useMemo(() => {
    if (!activeScheduleId) return null;
    const sched = scheduleById.get(activeScheduleId);
    return new Set((sched?.slots ?? []).map((s) => s.weekday));
  }, [activeScheduleId, scheduleById]);

  const monthLabel = MONTH_LABEL.format(new Date(Date.UTC(anchor.year, anchor.month - 1, 1, 12)));

  const goPrev = () => setAnchor((a) => (a.month === 1 ? { year: a.year - 1, month: 12 } : { year: a.year, month: a.month - 1 }));
  const goNext = () => setAnchor((a) => (a.month === 12 ? { year: a.year + 1, month: 1 } : { year: a.year, month: a.month + 1 }));
  const goToday = () => {
    const [y, m] = ymdInZone(new Date(), DEFAULT_TZ).split("-").map(Number);
    setAnchor({ year: y, month: m });
  };

  const onDragStart = (e: DragStartEvent) => setActiveScheduleId(scheduleByInstance.get(String(e.active.id)) ?? null);

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveScheduleId(null);
    const { active, over } = e;
    if (!over) return;
    const instanceId = String(active.id);
    const sched = scheduleById.get(scheduleByInstance.get(instanceId) ?? "");
    if (!sched) return;
    const inst = sched.instances.find((i) => i.instanceId === instanceId);
    if (!inst) return;

    const [y, mo, d] = String(over.id).split("-").map(Number);
    const dayAnchor = new Date(Date.UTC(y, mo - 1, d, 12));
    const jsWeekday = dayAnchor.getUTCDay();
    const tz = sched.timezone || DEFAULT_TZ;

    const matching = sched.slots
      .filter((s) => s.weekday === jsWeekday)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    if (matching.length === 0) {
      toast({
        variant: "destructive",
        title: "Kein Slot an diesem Tag",
        description: `„${sched.name}" hat an diesem Wochentag keinen Slot.`,
      });
      return;
    }

    const weekStart = weekStartOf(dayAnchor, tz);
    const occupied = new Set(
      sched.instances
        .filter((i) => i.instanceId !== instanceId && isLive(i) && i.weekStart === weekStart)
        .map((i) => i.slotId),
    );
    const target = matching.find((s) => !occupied.has(s.id)) ?? matching[0];
    if (inst.slotId === target.id && inst.weekStart === weekStart) return;

    try {
      await moveInstance(sched.id, instanceId, target.id, weekStart);
      onReload();
    } catch (err) {
      toast({ variant: "destructive", title: "Verschieben fehlgeschlagen", description: err instanceof Error ? err.message : undefined });
      onReload();
    }
  };

  const dragActive = activeScheduleId !== null;

  return (
    <div className="glass-card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer" onClick={goPrev} title="Vorheriger Monat">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={goToday}>
            heute
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer" onClick={goNext} title="Nächster Monat">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 font-display text-lg font-semibold capitalize">{monthLabel}</h2>
        </div>
        {schedules.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {schedules.map((sched, idx) => (
              <span key={sched.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-full ${trackColor(idx).dot}`} />
                {sched.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {orphans.length > 0 && (
          <div className="space-y-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Slot entfällt — neu zuordnen ({orphans.length})
            </div>
            <p className="text-[11px] text-muted-foreground">Auf einen Tag mit passendem Slot ziehen, um neu einzuplanen.</p>
            <div className="flex flex-wrap gap-1.5">
              {orphans.map((entry) => (
                <div key={entry.inst.instanceId} className="w-56 max-w-full">
                  <CalChip entry={entry} onRemove={onRemove} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-7 gap-1">
          {WEEKDAY_HEADERS.map((w) => (
            <div key={w} className="pb-1 text-center text-[11px] font-medium text-muted-foreground">
              {w}
            </div>
          ))}
          {cells.map((cell) => (
            <DayCell
              key={cell.ymd}
              cell={cell}
              dragActive={dragActive}
              isValidTarget={cell.inMonth && !!activeWeekdays?.has(cell.jsWeekday)}
              onRemove={onRemove}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
