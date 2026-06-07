"use client";

import { useState } from "react";
import Link from "next/link";
import { LinkedinPost } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sparkles,
  Loader2,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Circle,
  Link2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface BlogParentInfo {
  uuid: string;
  slug: string;
  contentType: "blog" | "article";
  title: string;
}

interface LinkedinEditorProps {
  post: LinkedinPost;
  parent?: BlogParentInfo | null;
  /** Called after a successful save / generate / status change so the parent can reload. */
  onChanged?: () => void;
  /** Called after the post was deleted (e.g. navigate away). */
  onDeleted?: () => void;
  /** Compact styling for inline use inside the blog detail. */
  compact?: boolean;
}

/**
 * Shared LinkedIn post editor (MICM-10). Reused both on /linkedin/[id] and inline
 * in the blog detail for attached posts — single implementation, no divergence.
 * Plain-text editor for linkedin_text + content-complete status. The
 * publishedLinkedIn status is a gray placeholder until MICM-12 (Publer).
 * Image/preview-card come in MICM-11.
 */
export function LinkedinEditor({ post, parent, onChanged, onDeleted, compact = false }: LinkedinEditorProps) {
  const isAttached = !!post.blogParentUuid;
  const [text, setText] = useState(post.linkedinText || "");
  const [sourceSummarized, setSourceSummarized] = useState(post.sourceSummarized || "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const hasSource = !!post.sourceRaw || !!sourceSummarized;
  const dirty = text !== (post.linkedinText || "") || sourceSummarized !== (post.sourceSummarized || "");

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // For standalone posts, persist the (possibly edited) source first so it
      // is not lost and the generation uses the current material.
      if (!isAttached && sourceSummarized && sourceSummarized !== (post.sourceSummarized || "")) {
        await fetch("/api/linkedin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: post.storyblokId, cm_source_summarized: sourceSummarized }),
        });
      }

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: post.storyblokId,
          type: "linkedin",
          sourceRaw: post.sourceRaw,
          sourceSummarized: sourceSummarized || post.sourceSummarized,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");

      setText(data.linkedin || "");
      toast({ title: "LinkedIn text generated", description: `Using ${data.modelUsed}` });
      onChanged?.();
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/linkedin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.storyblokId,
          linkedin_text: text,
          ...(!isAttached ? { cm_source_summarized: sourceSummarized } : {}),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      toast({ title: "Saved" });
      onChanged?.();
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async () => {
    setSaving(true);
    const newValue = !post.status.contentComplete.completed;
    try {
      const response = await fetch("/api/linkedin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.storyblokId,
          cm_content_complete: newValue,
          cm_content_confirmed_at: newValue ? new Date().toISOString() : "",
        }),
      });
      if (!response.ok) throw new Error("Failed to update");
      toast({ title: newValue ? "Marked content complete" : "Unmarked content complete" });
      onChanged?.();
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/linkedin?id=${encodeURIComponent(post.storyblokId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      toast({ title: "LinkedIn post deleted" });
      setConfirmDeleteOpen(false);
      onDeleted?.();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={cn("space-y-3 rounded-lg border border-border/50 bg-card p-4", compact && "bg-secondary/10")}>
      {/* Header: status + parent marker */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <LinkedinStatusDot
            label={
              post.status.contentComplete.color === "green"
                ? "Content complete"
                : post.status.contentComplete.color === "yellow"
                  ? "Text present"
                  : "No text yet"
            }
            color={post.status.contentComplete.color}
          />
          {/* publishedLinkedIn — gray placeholder until MICM-12 */}
          <LinkedinStatusDot label="Not published (Publer)" color="gray" />
        </div>

        {isAttached && parent && (
          <Link
            href={`/posts/${parent.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span className="truncate max-w-[220px]">Attached to: {parent.title}</span>
          </Link>
        )}
        {isAttached && !parent && (
          <Badge variant="outline" className="text-[10px]">Attached</Badge>
        )}
      </div>

      {/* Standalone: editable source so generation has material */}
      {!isAttached && (
        <Collapsible open={showSource} onOpenChange={setShowSource}>
          <CollapsibleTrigger className="flex items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground">
            {showSource ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Source material (for generation)
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Textarea
              value={sourceSummarized}
              onChange={(e) => setSourceSummarized(e.target.value)}
              placeholder="Paste source material here to generate a LinkedIn post from it..."
              className="mt-2 min-h-[100px] bg-secondary/40 text-xs"
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* LinkedIn text (plain text) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">LinkedIn Text</Label>
          <span className="text-[10px] text-muted-foreground">{text.length} chars</span>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write the LinkedIn post text, or generate it from the source material…"
          className="min-h-[200px] bg-secondary/40 text-sm whitespace-pre-wrap"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleGenerate}
            disabled={generating || !hasSource}
            title={hasSource ? "Generate LinkedIn text from source" : "No source material available"}
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate LinkedIn
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Content complete toggle */}
          {post.status.contentComplete.color !== "red" &&
            (post.status.contentComplete.completed ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground/50 hover:bg-yellow-600 hover:text-white"
                onClick={handleToggleComplete}
                disabled={saving}
                title="Mark incomplete"
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground/50 hover:bg-green-600 hover:text-white"
                onClick={handleToggleComplete}
                disabled={saving}
                title="Mark complete"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            ))}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground/50 hover:bg-red-600 hover:text-white"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={deleting}
            title="Delete LinkedIn post"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete LinkedIn post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this LinkedIn post. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LinkedinStatusDot({ label, color }: { label: string; color: string }) {
  const bgColor =
    color === "green" ? "bg-green-500/15" : color === "yellow" ? "bg-yellow-500/15" : color === "red" ? "bg-red-500/15" : "bg-gray-500/15";
  const iconColor =
    color === "green" ? "text-green-500" : color === "yellow" ? "text-yellow-500" : color === "red" ? "text-red-500" : "text-gray-400";
  const Icon = color === "green" ? CheckCircle : color === "yellow" ? AlertCircle : color === "red" ? XCircle : Circle;
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", bgColor)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
