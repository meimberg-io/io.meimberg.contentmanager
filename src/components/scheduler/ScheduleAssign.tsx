"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Schedule, ScheduleEntryType } from "@/types";
import { projectedDateForIndex } from "@/lib/schedule-time";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Loader2, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ScheduleAssignProps {
  storyUuid: string;
  typ: ScheduleEntryType;
  /** Whether the post itself is content-complete (gates the Einplanen button). */
  complete: boolean;
  onChanged?: () => void;
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

/**
 * Assign a post to a publishing schedule (MICM-18). Shows the current assignment +
 * projected slot date, or a schedule picker + "Einplanen" button. The content-complete
 * gate is enforced both here (disabled button) and server-side (the assign route).
 */
export function ScheduleAssign({ storyUuid, typ, complete, onChanged }: ScheduleAssignProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = res.ok ? await res.json() : null;
      const list: Schedule[] = Array.isArray(data?.settings?.schedules) ? data.settings.schedules : [];
      setSchedules(list);
      setSelectedId((prev) => prev || list[0]?.id || "");
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assignment = useMemo(
    () => schedules.find((s) => s.queue.some((e) => e.storyUuid === storyUuid)) || null,
    [schedules, storyUuid],
  );
  const projected = useMemo(() => {
    if (!assignment) return null;
    const index = assignment.queue.findIndex((e) => e.storyUuid === storyUuid);
    return projectedDateForIndex(new Date(), assignment, index);
  }, [assignment, storyUuid]);

  const assign = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/schedule/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyUuid, typ, scheduleId: selectedId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Einplanen fehlgeschlagen");
      toast({ title: "Eingeplant" });
      await load();
      onChanged?.();
    } catch (e) {
      toast({ variant: "destructive", title: "Einplanen fehlgeschlagen", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const unassign = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/schedule/assign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyUuid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Aus dem Plan nehmen fehlgeschlagen");
      toast({ title: "Aus dem Plan genommen" });
      await load();
      onChanged?.();
    } catch (e) {
      toast({ variant: "destructive", title: "Fehler", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Schedules laden…
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        Kein Schedule angelegt — erst in den Einstellungen anlegen.
      </div>
    );
  }

  if (assignment) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-blue-400" />
          <span>
            Geplant: <span className="font-medium">{assignment.name}</span>
            {projected && (
              <span className="text-muted-foreground"> · {formatSlot(projected, assignment.timezone || "Europe/Berlin")}</span>
            )}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground/60 hover:bg-red-600 hover:text-white"
          onClick={unassign}
          disabled={busy}
          title="Aus dem Plan nehmen"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarClock className="h-4 w-4" />
        <span>Einplanen</span>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="h-8 w-[150px] bg-secondary/40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {schedules.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1.5 text-muted-foreground/60 hover:bg-green-600 hover:text-white disabled:opacity-40"
        onClick={assign}
        disabled={busy || !complete}
        title={complete ? "In den gewählten Schedule einplanen" : "Erst als 'content complete' markieren"}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Einplanen
      </Button>
    </div>
  );
}
