"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LinkedinPost } from "@/types";
import type { AIModel } from "@/lib/ai-provider";
import type { BlogLinkPreview } from "@/lib/linkedin-link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Wand2,
  TagIcon,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Parent blog link preview (resolved server-side, MICM-11). */
export type BlogParentInfo = BlogLinkPreview;

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-500/20 text-green-400 border-green-500/30",
  anthropic: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  google: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Claude",
  google: "Gemini",
};

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
 *
 * Standalone posts get the full blog-style layout: a two-column grid with the text
 * editor on the left and a right "Marginalspalte" holding AI settings (model, hint,
 * DALL-E image prompt), tags, and source material. Attached/compact posts stay a
 * single column — their source/image/tags mirror the parent blog and are not edited
 * here.
 */
export function LinkedinEditor({ post, parent, onChanged, onDeleted, compact = false }: LinkedinEditorProps) {
  const isAttached = !!post.blogParentUuid;
  const [text, setText] = useState(post.linkedinText || "");
  const [sourceRaw, setSourceRaw] = useState(post.sourceRaw || "");
  const [sourceSummarized, setSourceSummarized] = useState(post.sourceSummarized || "");
  const [aiHint, setAiHint] = useState(post.aiHint || "");
  const [imagePrompt, setImagePrompt] = useState(post.imagePrompt || "");
  const [tags, setTags] = useState<string[]>(post.tags || []);
  const [newTag, setNewTag] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(post.linkedinImage);
  // Transient per-request model override (null = use the configured default).
  const [model, setModel] = useState<string | null>(null);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingTags, setGeneratingTags] = useState(false);
  const [generatingImagePrompt, setGeneratingImagePrompt] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [optimizeInstruction, setOptimizeInstruction] = useState("");
  const [optimizeRange, setOptimizeRange] = useState<{ start: number; end: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [showSource, setShowSource] = useState(!!post.sourceRaw || !!post.sourceSummarized);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Model list for the standalone AI-settings panel.
  useEffect(() => {
    if (isAttached) return;
    fetch("/api/ai/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setAiModels(data.models || []);
          setDefaultModel(data.defaultModel || "");
        }
      })
      .catch(() => {});
  }, [isAttached]);

  const hasSource = !!sourceRaw || !!sourceSummarized;
  const tagsString = tags.join(", ");
  const dirty = isAttached
    ? text !== (post.linkedinText || "")
    : text !== (post.linkedinText || "") ||
      sourceRaw !== (post.sourceRaw || "") ||
      sourceSummarized !== (post.sourceSummarized || "") ||
      aiHint !== (post.aiHint || "") ||
      imagePrompt !== (post.imagePrompt || "") ||
      tagsString !== (post.tags || []).join(", ") ||
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
          hint: aiHint || undefined,
          modelId: model || undefined,
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

  const handleGenerateTags = async () => {
    setGeneratingTags(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "tags",
          sourceRaw: sourceRaw || post.sourceRaw,
          sourceSummarized: sourceSummarized || post.sourceSummarized,
          hint: aiHint || undefined,
          modelId: model || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tag generation failed");
      setTags(Array.isArray(data.tags) ? data.tags : []);
      toast({ title: "Tags generated", description: `Using ${data.modelUsed}` });
    } catch (error: any) {
      toast({ title: "Tag generation failed", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingTags(false);
    }
  };

  const addTag = (value: string) => {
    const t = value.trim().replace(/^#+/, "").trim();
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setNewTag("");
      return;
    }
    setTags([...tags, t]);
    setNewTag("");
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleGenerateImagePrompt = async () => {
    setGeneratingImagePrompt(true);
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prompt",
          sourceRaw: sourceRaw || post.sourceRaw,
          sourceSummarized: sourceSummarized || post.sourceSummarized,
          hint: aiHint || undefined,
          modelId: model || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Prompt generation failed");
      setImagePrompt(data.imagePrompt || "");
      toast({ title: "Image prompt generated" });
    } catch (error: any) {
      toast({ title: "Prompt generation failed", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingImagePrompt(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({ title: "Add an image prompt first", variant: "destructive" });
      return;
    }
    setGeneratingImage(true);
    try {
      const imgRes = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "image", dallePrompt: imagePrompt }),
      });
      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgData.error || "Image generation failed");

      const upRes = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload",
          base64: imgData.base64,
          filename: `linkedin-${post.slug || "post"}.png`,
        }),
      });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || "Upload failed");

      setImageUrl(upData.assetUrl);
      toast({ title: "Image generated", description: "Save to attach it to the post." });
    } catch (error: any) {
      toast({ title: "Image generation failed", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  };

  const openOptimize = () => {
    const el = textareaRef.current;
    if (el && el.selectionEnd > el.selectionStart) {
      setOptimizeRange({ start: el.selectionStart, end: el.selectionEnd });
    } else {
      setOptimizeRange(null);
    }
    setOptimizeOpen(true);
  };

  const handleOptimize = async () => {
    if (!optimizeInstruction.trim()) {
      toast({ title: "Add an instruction first", variant: "destructive" });
      return;
    }
    const target = optimizeRange ? text.slice(optimizeRange.start, optimizeRange.end) : text;
    if (!target.trim()) {
      toast({ title: "No text to optimize", variant: "destructive" });
      return;
    }
    setOptimizing(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "optimize",
          text: target,
          instruction: optimizeInstruction.trim(),
          // LinkedIn text is plain text — never treat it as a markdown document.
          isFullDocument: false,
          modelId: model || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Optimization failed");
      const optimized = data.optimizedText ?? "";
      if (optimizeRange) {
        setText(text.slice(0, optimizeRange.start) + optimized + text.slice(optimizeRange.end));
      } else {
        setText(optimized);
      }
      setOptimizeOpen(false);
      setOptimizeInstruction("");
      toast({ title: "Text optimized", description: `Using ${data.modelUsed}` });
    } catch (error: any) {
      toast({ title: "Optimization failed", description: error.message, variant: "destructive" });
    } finally {
      setOptimizing(false);
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
                cm_ai_hint: aiHint,
                cm_image_prompt: imagePrompt,
                cm_tags: tags.join(", "),
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

  // --- Render fragments shared across the two layouts ---------------------

  const statusHeader = (
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
      {isAttached && !parent && <Badge variant="outline" className="text-[10px]">Attached</Badge>}
    </div>
  );

  const attachedPreview = isAttached && parent && (
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
  );

  const imagePanel = (
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
  );

  const textEditor = (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">LinkedIn Text</Label>
        <span className="text-[10px] text-muted-foreground">{text.length} chars</span>
      </div>
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write the LinkedIn post text, or generate it from the source material…"
        className="min-h-[200px] bg-secondary/40 text-sm whitespace-pre-wrap"
      />
    </div>
  );

  const actions = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={openOptimize}
            disabled={optimizing || !text.trim()}
            title={text.trim() ? "Optimize the text with an instruction" : "No text to optimize"}
          >
            {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            Optimize
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
    </>
  );

  // --- Standalone sidebar panels ------------------------------------------

  const selectedModel = aiModels.find((m) => m.id === model);
  const defModelName = aiModels.find((m) => m.id === defaultModel)?.name || defaultModel || "not set";

  const aiSettingsPanel = (
    <div className="rounded-lg border border-blue-500/20 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-400" />
        <span className="font-medium text-sm">AI Settings</span>
        {(model || aiHint) && (
          <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-400">Custom</Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Model</Label>
        <Select
          value={model || "default"}
          onValueChange={(value) => setModel(value === "default" ? null : value)}
        >
          <SelectTrigger className="bg-secondary/50 text-xs h-9">
            <SelectValue>
              {selectedModel ? (
                <span className="flex items-center justify-between w-full gap-2">
                  <span className="truncate">{selectedModel.name}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", PROVIDER_COLORS[selectedModel.provider])}>
                    {PROVIDER_LABELS[selectedModel.provider]}
                  </Badge>
                </span>
              ) : (
                `Default (${defModelName})`
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default" className="text-xs">
              Default ({defModelName})
            </SelectItem>
            {aiModels.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <span className="flex items-center justify-between w-full gap-2">
                  <span>{m.name}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", PROVIDER_COLORS[m.provider])}>
                    {PROVIDER_LABELS[m.provider]}
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Additional hint</Label>
        <Textarea
          value={aiHint}
          onChange={(e) => setAiHint(e.target.value)}
          placeholder="E.g. 'Was mit Geld und Automatisierung', 'Stil: locker'…"
          className="min-h-[70px] bg-secondary/40 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Image Prompt (DALL-E)</Label>
          <button
            type="button"
            onClick={handleGenerateImagePrompt}
            disabled={generatingImagePrompt || !hasSource}
            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={hasSource ? "Generate a prompt from the source material" : "No source material available"}
          >
            {generatingImagePrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {imagePrompt ? "Regenerate" : "Generate"}
          </button>
        </div>
        <Textarea
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          placeholder="Prompt for the post image…"
          className="min-h-[70px] bg-secondary/40 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          onClick={handleGenerateImage}
          disabled={generatingImage || !imagePrompt.trim()}
        >
          {generatingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          Generate image
        </Button>
      </div>
    </div>
  );

  const tagsPanel = (
    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Tags</span>
        </div>
        <button
          type="button"
          onClick={handleGenerateTags}
          disabled={generatingTags || !hasSource}
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title={hasSource ? "Generate tags from the source material" : "No source material available"}
        >
          {generatingTags ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Generate
        </button>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1 text-xs"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="text-muted-foreground/60 hover:text-red-500 cursor-pointer"
                title="Remove tag"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No tags yet.</p>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(newTag);
            }
          }}
          placeholder="Add a tag…"
          className="h-8 bg-secondary/40 text-xs"
        />
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0"
          onClick={() => addTag(newTag)}
          disabled={!newTag.trim()}
          title="Add tag"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const sourcePanel = (
    <div className="rounded-lg border border-border/50 bg-card p-4">
      <Collapsible open={showSource} onOpenChange={setShowSource}>
        <CollapsibleTrigger className="flex w-full items-center gap-1 text-left text-sm font-medium hover:text-foreground">
          {showSource ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Source material (for generation)
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
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
    </div>
  );

  // --- Dialogs (shared) ---------------------------------------------------

  const dialogs = (
    <>
      <Dialog open={optimizeOpen} onOpenChange={setOptimizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Optimize LinkedIn text</DialogTitle>
            <DialogDescription>
              {optimizeRange
                ? "A text selection was detected. Only the selected text will be optimized."
                : "No selection detected. The entire LinkedIn text will be optimized."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={optimizeInstruction}
            onChange={(e) => setOptimizeInstruction(e.target.value)}
            placeholder="E.g. 'Make it more casual', 'Shorten by half', 'Stronger hook'…"
            className="min-h-[90px] bg-secondary/40 text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptimizeOpen(false)} disabled={optimizing}>
              Cancel
            </Button>
            <Button onClick={handleOptimize} disabled={optimizing || !optimizeInstruction.trim()} className="gap-2">
              {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Optimize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );

  // --- Layout: attached/compact = single column; standalone = two columns -

  if (isAttached) {
    return (
      <div className={cn("space-y-3 rounded-lg border border-border/50 bg-card p-4", compact && "bg-secondary/10")}>
        {statusHeader}
        {attachedPreview}
        {textEditor}
        {actions}
        {dialogs}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3 rounded-lg border border-border/50 bg-card p-4">
          {statusHeader}
          {imagePanel}
          {textEditor}
          {actions}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-4">
          {aiSettingsPanel}
          {tagsPanel}
          {sourcePanel}
        </aside>
      </div>
      {dialogs}
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
