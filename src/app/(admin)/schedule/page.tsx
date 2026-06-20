"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ScheduleSlot, ScheduleEntryType } from "@/types";
import { projectedDateForIndex } from "@/lib/schedule-time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, GripVertical, Loader2, Play, X, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PlanEntry {
  storyUuid: string;
  typ: ScheduleEntryType;
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
  slots: ScheduleSlot[];
  entries: PlanEntry[];
}

const WEEKDAY_SHORT: Record<number, string> = { 1: "Mo", 2: "Di", 3: "Mi", 4: "Do", 5: "Fr", 6: "Sa", 0: "So" };
const TYP_LABEL: Record<ScheduleEntryType, string> = { blog: "Blog", article: "Artikel", linkedin: "LinkedIn" };

const slotSortKey = (s: ScheduleSlot) => {
  const [h, m] = s.time.split(":").map(Number);
  return ((s.weekday + 6) % 7) * 10000 + (h || 0) * 60 + (m || 0);
};

function entryHref(e: PlanEntry): string | null {
  if (!e.exists) return null;
  if (e.typ === "linkedin") return e.storyId ? `/linkedin/${e.storyId}` : null;
  return e.slug ? `/posts/${e.slug}` : null;
}

function formatSlot(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

function EntryRow({
  entry,
  projected,
  timezone,
  onRemove,
}: {
  entry: PlanEntry;
  projected: Date | null;
  timezone: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.storyUuid });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const href = entryHref(entry);
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        title="Ziehen zum Sortieren"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">{TYP_LABEL[entry.typ]}</Badge>
      <div className="min-w-0 flex-1">
        {href ? (
          <Link href={href} className="block truncate text-sm hover:underline">{entry.title}</Link>
        ) : (
          <span className="block truncate text-sm text-muted-foreground">{entry.title}</span>
        )}
      </div>
      {!entry.exists && (
        <Badge variant="outline" className="shrink-0 gap-1 border-red-500/40 text-xs text-red-400">
          <AlertTriangle className="h-3 w-3" />
          gelöscht
        </Badge>
      )}
      {entry.exists && entry.published && (
        <Badge variant="outline" className="shrink-0 gap-1 border-yellow-500/40 text-xs text-yellow-500">
          <AlertTriangle className="h-3 w-3" />
          bereits veröffentlicht
        </Badge>
      )}
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {projected ? formatSlot(projected, timezone) : "—"}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0 text-muted-foreground/60 hover:bg-red-600 hover:text-white"
        onClick={onRemove}
        title="Aus dem Plan nehmen"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<PlanSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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

  const handleDragEnd = async (scheduleId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sched = schedules.find((s) => s.id === scheduleId);
    if (!sched) return;
    const oldIndex = sched.entries.findIndex((e) => e.storyUuid === active.id);
    const newIndex = sched.entries.findIndex((e) => e.storyUuid === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newEntries = arrayMove(sched.entries, oldIndex, newIndex);
    setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? { ...s, entries: newEntries } : s)));

    try {
      const res = await fetch("/api/schedule/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, orderedUuids: newEntries.map((e) => e.storyUuid) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Reorder fehlgeschlagen");
    } catch (e) {
      toast({ variant: "destructive", title: "Sortieren fehlgeschlagen", description: e instanceof Error ? e.message : undefined });
      load(); // revert to server truth
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

  const slotSummary = (slots: ScheduleSlot[]) =>
    [...slots]
      .sort((a, b) => slotSortKey(a) - slotSortKey(b))
      .map((s) => `${WEEKDAY_SHORT[s.weekday] ?? s.weekday} ${s.time}`)
      .join(" · ");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Geplant</h1>
          <p className="text-muted-foreground mt-1">Eingeplante Beiträge je Schedule — Reihenfolge per Drag &amp; Drop.</p>
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
          {schedules.map((sched) => (
            <div key={sched.id} className="glass-card space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <CalendarClock className="h-4 w-4 text-blue-400" />
                  {sched.name}
                </h2>
                <span className="text-xs text-muted-foreground">{slotSummary(sched.slots) || "keine Slots"}</span>
              </div>

              {sched.entries.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">Keine Beiträge eingeplant.</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(sched.id, e)}>
                  <SortableContext items={sched.entries.map((e) => e.storyUuid)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {sched.entries.map((entry, index) => (
                        <EntryRow
                          key={entry.storyUuid}
                          entry={entry}
                          projected={projectedDateForIndex(new Date(), sched, index)}
                          timezone={sched.timezone || "Europe/Berlin"}
                          onRemove={() => removeEntry(entry.storyUuid)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
