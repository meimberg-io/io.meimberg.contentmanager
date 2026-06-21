"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Slot, ScheduleEntryType, SlotInstanceStatus } from "@/types";
import { deriveUpcomingSlots, instanceDate } from "@/lib/schedule-time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, GripVertical, Loader2, Play, X, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PlanInstance {
  instanceId: string;
  storyUuid: string;
  typ: ScheduleEntryType;
  status: SlotInstanceStatus;
  slotId: string | null;
  weekStart: string;
  isOrphan: boolean;
  date: string | null;
  errorCount?: number;
  lastError?: string;
  title: string;
  slug: string;
  storyId: string;
  exists: boolean;
  published: boolean;
}
interface PlanSchedule {
  id: string;
  name: string;
  timezone: string;
  horizonWeeks: number;
  slots: Slot[];
  instances: PlanInstance[];
}

const WEEKDAY_SHORT: Record<number, string> = { 1: "Mo", 2: "Di", 3: "Mi", 4: "Do", 5: "Fr", 6: "Sa", 0: "So" };
const TYP_LABEL: Record<ScheduleEntryType, string> = { blog: "Blog", article: "Artikel", linkedin: "LinkedIn" };
const DEFAULT_TZ = "Europe/Berlin";

const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const slotSortKey = (s: Slot): number => ((s.weekday + 6) % 7) * 10000 + timeToMinutes(s.time);
const cellKey = (slotId: string, weekStart: string) => `${slotId}__${weekStart}`;
/** Only pending/failed instances are actionable (movable / can be a swap target). */
const isLive = (i: PlanInstance) => i.status === "pending" || i.status === "failed";

function entryHref(e: PlanInstance): string | null {
  if (!e.exists) return null;
  if (e.typ === "linkedin") return e.storyId ? `/linkedin/${e.storyId}` : null;
  return e.slug ? `/posts/${e.slug}` : null;
}

function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}
function formatWeekLabel(weekStart: string): string {
  const [y, mo, d] = weekStart.split("-").map(Number);
  const monday = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(monday);
}

interface GridCell {
  slot: Slot;
  weekStart: string;
  date: Date;
  inst: PlanInstance | null;
}
function buildGrid(sched: PlanSchedule) {
  const tz = sched.timezone || DEFAULT_TZ;
  const now = new Date();
  const sortedSlots = [...sched.slots].sort((a, b) => slotSortKey(a) - slotSortKey(b));
  const horizonWeeks = Array.from(
    new Set(deriveUpcomingSlots({ slots: sched.slots, timezone: tz }, now, sched.horizonWeeks || 8).map((c) => c.weekStart)),
  );
  // Also surface live instances whose week is in the past (overdue, not yet fired).
  const liveWeeks = sched.instances.filter((i) => !i.isOrphan && isLive(i)).map((i) => i.weekStart);
  const weekStarts = Array.from(new Set([...horizonWeeks, ...liveWeeks])).sort();

  const byCell = new Map<string, PlanInstance>();
  for (const i of sched.instances) {
    if (!i.isOrphan && i.slotId) byCell.set(cellKey(i.slotId, i.weekStart), i);
  }

  const weeks = weekStarts.map((weekStart) => ({
    weekStart,
    cells: sortedSlots.map(
      (slot): GridCell => ({ slot, weekStart, date: instanceDate(slot, weekStart, tz), inst: byCell.get(cellKey(slot.id, weekStart)) || null }),
    ),
  }));
  const orphans = sched.instances.filter((i) => i.isOrphan);
  return { weeks, orphans };
}

function PostChip({ inst, onRemove, draggable }: { inst: PlanInstance; onRemove: () => void; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: inst.instanceId, disabled: !draggable });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 };
  const href = entryHref(inst);
  const statusTint =
    inst.status === "published"
      ? "border-green-500/40 bg-green-500/5"
      : inst.status === "failed"
        ? "border-red-500/40 bg-red-500/5"
        : inst.status === "skipped"
          ? "border-border/40 bg-background/40 opacity-70"
          : "border-border/50 bg-secondary/30";
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${statusTint}`}>
      {draggable && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
          title="Ziehen, um auf einen anderen Slot zu legen"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">{TYP_LABEL[inst.typ]}</Badge>
      <div className="min-w-0 flex-1">
        {href ? (
          <Link href={href} className="block truncate text-sm hover:underline">{inst.title}</Link>
        ) : (
          <span className="block truncate text-sm text-muted-foreground">{inst.title}</span>
        )}
      </div>
      {!inst.exists && (
        <Badge variant="outline" className="shrink-0 gap-1 border-red-500/40 text-[10px] text-red-400">
          <AlertTriangle className="h-3 w-3" /> gelöscht
        </Badge>
      )}
      {inst.status === "published" && (
        <Badge variant="outline" className="shrink-0 text-[10px] text-green-500">veröffentlicht</Badge>
      )}
      {inst.status === "skipped" && (
        <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">übersprungen</Badge>
      )}
      {inst.status === "failed" && (
        <Badge variant="outline" className="shrink-0 gap-1 border-red-500/40 text-[10px] text-red-400" title={inst.lastError}>
          <AlertTriangle className="h-3 w-3" /> fehlgeschlagen
        </Badge>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 shrink-0 text-muted-foreground/60 hover:bg-red-600 hover:text-white"
        onClick={onRemove}
        title="Aus dem Plan nehmen"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SlotCell({ cell, timezone, onRemove }: { cell: GridCell; timezone: string; onRemove: (uuid: string) => void }) {
  const id = cellKey(cell.slot.id, cell.weekStart);
  // A cell accepts a drop unless it holds a non-live (historic) instance.
  const droppable = !cell.inst || isLive(cell.inst);
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !droppable });
  const past = cell.date.getTime() < Date.now();
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[240px] flex-1 rounded-lg border p-2 transition-colors ${
        isOver ? "border-blue-400 ring-2 ring-blue-400/40" : "border-border/40"
      } ${past && !cell.inst ? "opacity-50" : ""}`}
    >
      <div className="mb-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">{formatDateTime(cell.date, timezone)}</div>
      {cell.inst ? (
        <PostChip inst={cell.inst} draggable={isLive(cell.inst)} onRemove={() => onRemove(cell.inst!.storyUuid)} />
      ) : (
        <div className="rounded-md border border-dashed border-border/40 px-2 py-2 text-center text-xs italic text-muted-foreground/60">
          frei
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<PlanSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule");
      const data = res.ok ? await res.json() : null;
      setSchedules(Array.isArray(data?.schedules) ? data.schedules : []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDragEnd = async (sched: PlanSchedule, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const instanceId = String(active.id);
    const [slotId, weekStart] = String(over.id).split("__");
    const inst = sched.instances.find((i) => i.instanceId === instanceId);
    if (!inst || (inst.slotId === slotId && inst.weekStart === weekStart)) return;

    try {
      const res = await fetch("/api/schedule/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: sched.id, instanceId, slotId, weekStart }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Verschieben fehlgeschlagen");
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Verschieben fehlgeschlagen", description: e instanceof Error ? e.message : undefined });
      load();
    }
  };

  const removeEntry = async (storyUuid: string) => {
    try {
      const res = await fetch("/api/schedule/assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyUuid }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Entfernen fehlgeschlagen");
      toast({ title: "Aus dem Plan genommen" });
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Fehler", description: e instanceof Error ? e.message : undefined });
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/cron/tick", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Tick fehlgeschlagen");
      const fired = Array.isArray(data?.results) ? data.results.filter((r: { fired?: boolean }) => r.fired).length : 0;
      toast({ title: "Scheduler ausgeführt", description: `${fired} Beitrag/Beiträge veröffentlicht.` });
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Fehler", description: e instanceof Error ? e.message : undefined });
    } finally {
      setRunning(false);
    }
  };

  const slotSummary = (slots: Slot[]) =>
    [...slots]
      .sort((a, b) => slotSortKey(a) - slotSortKey(b))
      .map((s) => `${WEEKDAY_SHORT[s.weekday] ?? s.weekday} ${s.time}`)
      .join(" · ");

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Geplant</h1>
          <p className="text-muted-foreground mt-1">Redaktionsplan je Track — Beiträge per Drag auf einen Slot legen (auf belegten Slot = tauschen).</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={runNow} disabled={running}>
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Jetzt ausführen
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Laden…
        </div>
      ) : schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 bg-secondary/10 p-8 text-center text-sm text-muted-foreground">
          Noch kein Schedule angelegt. Lege in den{" "}
          <Link href="/settings" className="underline">Einstellungen</Link> einen an.
        </div>
      ) : (
        <div className="space-y-6">
          {schedules.map((sched) => {
            const { weeks, orphans } = buildGrid(sched);
            const tz = sched.timezone || DEFAULT_TZ;
            return (
              <div key={sched.id} className="glass-card space-y-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                    <CalendarClock className="h-4 w-4 text-blue-400" />
                    {sched.name}
                  </h2>
                  <span className="text-xs text-muted-foreground">{slotSummary(sched.slots) || "keine Slots"}</span>
                </div>

                {orphans.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Slot entfällt — neu zuordnen ({orphans.length})
                    </div>
                    <p className="text-[11px] text-muted-foreground">Auf einen freien Slot ziehen, um neu einzuplanen.</p>
                    {orphans.map((inst) => (
                      <PostChip key={inst.instanceId} inst={inst} draggable onRemove={() => removeEntry(inst.storyUuid)} />
                    ))}
                  </div>
                )}

                {sched.slots.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Keine Slots — in den Einstellungen anlegen.</p>
                ) : (
                  <DndContext sensors={sensors} onDragEnd={(e) => handleDragEnd(sched, e)}>
                    <div className="space-y-3">
                      {weeks.map(({ weekStart, cells }) => (
                        <div key={weekStart} className="space-y-1.5">
                          <div className="text-xs font-medium text-muted-foreground">Woche ab Mo {formatWeekLabel(weekStart)}</div>
                          <div className="flex flex-wrap gap-2">
                            {cells.map((cell) => (
                              <SlotCell
                                key={cellKey(cell.slot.id, weekStart)}
                                cell={cell}
                                timezone={tz}
                                onRemove={removeEntry}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DndContext>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
