"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LinkedinPost } from "@/types";
import type { BlogLinkPreview } from "@/lib/linkedin-link";
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
  ImageIcon,
  Upload,
  X,
  AlertTriangle,
  Send,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Parent blog link preview (resolved server-side, MICM-11). */
export type BlogParentInfo = BlogLinkPreview;

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
  const [sourceRaw, setSourceRaw] = useState(post.sourceRaw || "");
  const [sourceSummarized, setSourceSummarized] = useState(post.sourceSummarized || "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(post.linkedinImage);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [showSource, setShowSource] = useState(!!post.sourceRaw || !!post.sourceSummarized);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasSource = !!sourceRaw || !!sourceSummarized;
  const dirty =
    text !== (post.linkedinText || "") ||
    sourceRaw !== (post.sourceRaw || "") ||
    sourceSummarized !== (post.sourceSummarized || "") ||
    imageUrl !== post.linkedinImage;

  const isPublished = post.status.publishedLinkedIn.completed;
  // Publish guard (MICM-12 AK6): attached posts require a published parent blog.
  const blockedReason = !post.linkedinText.trim()
    ? "Add and save LinkedIn text first"
    : dirty
      ? "Save your changes before publishing"
      : isAttached && parent && !parent.published
        ? "Parent blog is not published yet"
        : isAttached && !parent
          ? "Parent blog could not be resolved"
          : null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // For standalone posts, persist the (possibly edited) source first so it
      // is not lost and the generation uses the current material.
      if (
        !isAttached &&
        (sourceRaw !== (post.sourceRaw || "") || sourceSummarized !== (post.sourceSummarized || ""))
      ) {
        await fetch("/api/linkedin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: post.storyblokId,
            cm_source_raw: sourceRaw,
            cm_source_summarized: sourceSummarized,
          }),
        });
      }

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: post.storyblokId,
          type: "linkedin",
          sourceRaw: sourceRaw || post.sourceRaw,
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

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/posts/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.publicUrl || data.filename);
      toast({ title: "Image uploaded", description: "Save to attach it to the post." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
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
          ...(!isAttached
            ? {
                cm_source_raw: sourceRaw,
                cm_source_summarized: sourceSummarized,
                // Standalone image: send asset object, or "" to clear.
                linkedin_image: imageUrl ? { filename: imageUrl, fieldtype: "asset" } : "",
              }
            : {}),
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

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await fetch("/api/publishing/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.storyblokId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Publish failed");
      toast({ title: "Published to LinkedIn", description: data.message });
      setConfirmPublishOpen(false);
      onChanged?.();
    } catch (error: any) {
      toast({ title: "Publish failed", description: error.message, variant: "destructive" });
    } finally {
      setPublishing(false);
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
          {/* publishedLinkedIn — real status (MICM-12) */}
          <LinkedinStatusDot
            label={
              isPublished
                ? `On LinkedIn${
                    post.status.publishedLinkedIn.timestamp
                      ? " · " + new Date(post.status.publishedLinkedIn.timestamp).toLocaleDateString()
                      : ""
                  }`
                : "Not published"
            }
            color={post.status.publishedLinkedIn.color}
          />
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

      {/* Attached: blog link preview card (OG-style). LinkedIn unfurls this card
          from the blog URL appended at publish time (MICM-12) — no own image. */}
      {isAttached && parent && (
        <div className="rounded-lg border border-border/60 overflow-hidden bg-secondary/20">
          {!parent.published ? (
            <div className="flex items-start gap-2 p-3 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Blog not published yet</p>
                <p className="text-xs text-muted-foreground">
                  Link &amp; preview will be available once the blog post is published. The link is appended automatically when you publish to LinkedIn.
                </p>
              </div>
            </div>
          ) : (
            <a href={parent.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-secondary/40 transition-colors">
              {parent.imageUrl && (
                <div className="relative w-full bg-muted" style={{ aspectRatio: "1200/630" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={parent.imageUrl} alt={parent.title} className="absolute inset-0 h-full w-full object-cover" />
                </div>
              )}
              <div className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
                  {parent.url.replace(/^https?:\/\//, "")}
                </p>
                <p className="text-sm font-medium line-clamp-2">{parent.title}</p>
              </div>
            </a>
          )}
        </div>
      )}

      {/* Standalone: own image (linkedin_image). No link/card for standalone. */}
      {!isAttached && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Image (optional)</Label>
            {imageUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-red-500"
                onClick={() => setImageUrl(undefined)}
              >
                <X className="h-3 w-3 mr-1" />
                Remove
              </Button>
            )}
          </div>
          {imageUrl ? (
            <div className="relative w-full overflow-hidden rounded-lg border border-border/50" style={{ aspectRatio: "1200/630" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="LinkedIn image" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-lg border border-dashed border-border/60 bg-secondary/10 p-6 text-center text-sm text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 mx-auto animate-spin opacity-50" />
              ) : (
                <>
                  <ImageIcon className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <span className="inline-flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" /> Upload an image
                  </span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadImage(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Standalone: editable source so generation has material. Both fields are
          shown and editable (mirrors the blog detail's Summary + Raw); generation
          prefers the summary and falls back to the raw transcription. */}
      {!isAttached && (
        <Collapsible open={showSource} onOpenChange={setShowSource}>
          <CollapsibleTrigger className="flex items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground">
            {showSource ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Source material (for generation)
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Summary</Label>
              <Textarea
                value={sourceSummarized}
                onChange={(e) => setSourceSummarized(e.target.value)}
                placeholder="Summarized source material — the preferred input for generation…"
                className="min-h-[100px] bg-secondary/40 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Raw transcription</Label>
              <Textarea
                value={sourceRaw}
                onChange={(e) => setSourceRaw(e.target.value)}
                placeholder="Raw transcription — used when no summary is present…"
                className="min-h-[100px] bg-secondary/40 text-xs"
              />
            </div>
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
          <Button
            size="sm"
            className="gap-2 bg-[#0a66c2] hover:bg-[#0a66c2]/90 text-white"
            onClick={() => setConfirmPublishOpen(true)}
            disabled={publishing || !!blockedReason}
            title={blockedReason || (isPublished ? "Re-publish (replaces the queued post)" : "Publish to LinkedIn via Publer")}
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isPublished ? "Re-publish" : "Publish"}
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

      {blockedReason && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-right">{blockedReason}</p>
      )}

      <AlertDialog open={confirmPublishOpen} onOpenChange={setConfirmPublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isPublished ? "Re-publish to LinkedIn?" : "Publish to LinkedIn?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isPublished
                ? "If this post is still in the Publer queue it will be replaced (no duplicate). If it has already been delivered, publishing is blocked."
                : "This schedules the post to the end of your LinkedIn queue via Publer."}
              {isAttached && " The published blog link will be appended automatically."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              disabled={publishing}
              className="bg-[#0a66c2] hover:bg-[#0a66c2]/90 text-white"
            >
              {publishing ? "Publishing..." : isPublished ? "Re-publish" : "Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
