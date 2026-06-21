"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, LayoutList, Loader2, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PlanSchedule } from "@/lib/scheduler/plan-view";
import { ScheduleTracksView } from "@/components/scheduler/ScheduleTracksView";
import { ScheduleCalendarView } from "@/components/scheduler/ScheduleCalendarView";

type ViewMode = "tracks" | "calendar";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<PlanSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<ViewMode>("tracks");

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

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Geplant</h1>
          <p className="text-muted-foreground mt-1">Redaktionsplan je Track — Beiträge per Drag auf einen Slot legen (auf belegten Slot = tauschen).</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/50 p-0.5">
            {([
              { key: "tracks", label: "Tracks", icon: LayoutList },
              { key: "calendar", label: "Kalender", icon: CalendarDays },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={runNow} disabled={running}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Jetzt ausführen
          </Button>
        </div>
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
      ) : view === "tracks" ? (
        <ScheduleTracksView schedules={schedules} onReload={load} onRemove={removeEntry} />
      ) : (
        <ScheduleCalendarView schedules={schedules} onReload={load} onRemove={removeEntry} />
      )}
    </div>
  );
}
