"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { BlogPost } from "@/types";
import { transformStoryblokBlog } from "@/lib/transform-storyblok";
// StatusRow removed - using inline StatusDot instead
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Save,
  Sparkles,
  Loader2,
  Globe,
  GlobeIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  FileText,
  PenLine,
  ImageIcon,
  RefreshCw,
  Pencil,
  RotateCcw,
  Wand2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

/** remark-gfm can't parse tables directly after list items – insert a blank line before them */
const fixTables = (s: string) => s.replace(/([^\n|])\n(\|)/g, '$1\n\n$2');

/** Derive a URL slug from a title */
function deriveSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

import { getRichtextEditor } from "@/components/blocks/RichtextBlock";

// Dynamic import BodyEditor to avoid SSR issues with dnd-kit/tiptap
const BodyEditor = dynamic(
  () => import("@/components/blocks/BodyEditor").then((m) => m.BodyEditor),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-secondary/20 rounded-lg" /> }
);

interface AIModel {
  id: string;
  name: string;
  provider: string;
}

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

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.id as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [rawStory, setRawStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState<Set<string>>(new Set());

  // AI Settings
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [transientModel, setTransientModel] = useState<string | null>(null);
  const [transientPromptHint, setTransientPromptHint] = useState("");
  const [mainPrompt, setMainPrompt] = useState("");
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showMetaFields, setShowMetaFields] = useState(true);

  // Header image generation
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);
  const [headerPictureUrl, setHeaderPictureUrl] = useState<string | undefined>(undefined);
  const [generatingImage, setGeneratingImage] = useState<"prompt" | "image" | null>(null);

  // Source edit dialog
  const [editSummaryOpen, setEditSummaryOpen] = useState(false);
  const [editSummaryText, setEditSummaryText] = useState("");

  // Generate All progress
  const [generateAllProgress, setGenerateAllProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  // Optimize dialog
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [optimizeInstruction, setOptimizeInstruction] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeSnapshot, setOptimizeSnapshot] = useState<{ blockUid: string; content: any } | null>(null);
  const optimizeJustApplied = useRef(false);

  // Slug
  const [slugValue, setSlugValue] = useState("");
  const [originalSlug, setOriginalSlug] = useState("");

  // Editable fields
  const [form, setForm] = useState({
    pagetitle: "",
    pageintro: "",
    teasertitle: "",
    abstract: "",
    readmoretext: "",
    date: "",
  });

  // Body blocks
  const [bodyBlocks, setBodyBlocks] = useState<any[]>([]);

  // Load post data
  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/posts/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast({ title: "Post not found", variant: "destructive" });
          router.push("/posts");
          return;
        }
        throw new Error("Failed to load post");
      }
      const data = await response.json();
      const story = data.story;

      setRawStory(story);
      const transformed = transformStoryblokBlog(story);
      setPost(transformed);
      setForm({
        pagetitle: transformed.pagetitle,
        pageintro: transformed.pageintro,
        teasertitle: transformed.teasertitle,
        abstract: transformed.abstract,
        readmoretext: transformed.readmoretext,
        date: transformed.date,
      });
      setSlugValue(transformed.slug);
      setOriginalSlug(transformed.slug);
      setBodyBlocks(transformed.body || []);
      setHeaderPictureUrl(transformed.headerpicture);
      setGeneratedImageBase64(null); // Clear any preview on reload
      if (transformed.aiHint) setTransientPromptHint(transformed.aiHint);
      if (transformed.imagePrompt) setImagePrompt(transformed.imagePrompt);
    } catch (error) {
      console.error("Failed to load post:", error);
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // Load AI models and settings
  useEffect(() => {
    Promise.all([
      fetch("/api/ai/models").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/settings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([modelsData, settingsData]) => {
        if (modelsData) {
          setAiModels(modelsData.models || []);
          setDefaultModel(
            settingsData?.settings?.aiModel ||
              modelsData.defaultModel ||
              ""
          );
        }
        if (settingsData?.settings?.aiPrompts?.caption) {
          setMainPrompt(settingsData.settings.aiPrompts.caption);
        }
      })
      .catch((err) => console.error("Failed to load AI settings:", err));
  }, []);

  // Auto-generate image prompt when post has source material but no prompt yet
  useEffect(() => {
    if (!post || imagePrompt) return;
    const hasSourceMaterial = post.sourceRaw || post.sourceSummarized;
    if (!hasSourceMaterial) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "prompt",
            sourceRaw: post.sourceRaw,
            sourceSummarized: post.sourceSummarized,
          }),
        });
        const data = await res.json();
        if (!cancelled && res.ok && data.imagePrompt) {
          setImagePrompt(data.imagePrompt);
        }
      } catch {
        // Silently fail — user can still generate manually
      }
    })();
    return () => { cancelled = true; };
  }, [post?.storyblokId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear optimize snapshot on manual edits to the body
  useEffect(() => {
    if (optimizeJustApplied.current) {
      optimizeJustApplied.current = false;
      return;
    }
    if (optimizeSnapshot) {
      setOptimizeSnapshot(null);
    }
  }, [bodyBlocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ───────────────────────────────────────────────

  const handleSave = async () => {
    if (!post || !rawStory) return;
    setSaving(true);

    try {
      // If there's a generated image, upload it first
      let headerpictureUpdate: any = undefined;
      if (generatedImageBase64) {
        const uploadRes = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upload",
            base64: generatedImageBase64,
            filename: `header-${post.slug}-${Date.now()}.png`,
          }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Image upload failed");
        headerpictureUpdate = { filename: uploadData.assetUrl, alt: form.pagetitle || post.slug };
      }

      const response = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.storyblokId,
          ...(slugValue !== originalSlug ? { slug: slugValue } : {}),
          ...form,
          body: bodyBlocks,
          cm_ai_hint: transientPromptHint || "",
          cm_image_prompt: imagePrompt || "",
          ...(headerpictureUpdate ? { headerpicture: headerpictureUpdate } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      toast({ title: "Saved successfully" });
      setOptimizeSnapshot(null);
      await loadPost();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleContentComplete = async () => {
    if (!post || !rawStory) return;
    setSaving(true);

    const newValue = !post.status.contentComplete.completed;
    try {
      const response = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.storyblokId,
          cm_content_complete: newValue,
          cm_content_confirmed_at: newValue ? new Date().toISOString() : "",
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast({
        title: newValue
          ? "Marked as content complete"
          : "Unmarked content complete",
      });
      await loadPost();
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!post) return;
    setPublishing(true);

    try {
      const response = await fetch(
        `/api/posts/${post.storyblokId}/publish`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to publish");
      }

      toast({ title: "Published successfully" });
      await loadPost();
    } catch (error: any) {
      toast({
        title: "Publish failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!post) return;
    setPublishing(true);

    try {
      const response = await fetch(
        `/api/posts/${post.storyblokId}/publish`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unpublish");
      }

      toast({ title: "Unpublished successfully" });
      await loadPost();
    } catch (error: any) {
      toast({
        title: "Unpublish failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Helper to mark a field as generating / done
  const startGenerating = (type: string) =>
    setGenerating((prev) => new Set(prev).add(type));
  const stopGenerating = (type: string) =>
    setGenerating((prev) => {
      const next = new Set(prev);
      next.delete(type);
      return next;
    });

  const handleGenerate = async (type: string) => {
    if (!post) return;
    startGenerating(type);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: post.storyblokId,
          type,
          sourceRaw: post.sourceRaw,
          sourceSummarized: post.sourceSummarized,
          hint: transientPromptHint || undefined,
          modelId: transientModel || undefined,
          existingContent: form,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");

      if (data[type] !== undefined) {
        setForm((prev) => ({ ...prev, [type]: data[type] }));
      }

      toast({
        title: "Content generated",
        description: `Generated ${type} using ${data.modelUsed}`,
      });
    } catch (error: any) {
      toast({
        title: `Generation failed (${type})`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      stopGenerating(type);
    }
  };

  const handleGenerateBody = async () => {
    if (!post) return;
    startGenerating("body");

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "body",
          sourceRaw: post.sourceRaw,
          sourceSummarized: post.sourceSummarized,
          hint: transientPromptHint || undefined,
          modelId: transientModel || undefined,
          existingContent: form,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");

      if (data.bodyContent) {
        const newBlock = {
          _uid: crypto.randomUUID().replace(/-/g, "").substring(0, 36),
          component: "richtext",
          content: data.bodyContent,
        };
        setBodyBlocks((prev) => [newBlock, ...prev]);
        toast({
          title: "Article generated",
          description: `Body content generated using ${data.modelUsed}. Don't forget to save!`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Generation failed (body)",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      stopGenerating("body");
    }
  };

  const handleGenerateAll = async () => {
    if (!post) return;

    const steps: { key: string; label: string; fn: () => Promise<void> }[] = [
      { key: "pagetitle", label: "Page Title", fn: () => handleGenerate("pagetitle") },
      { key: "pageintro", label: "Page Intro", fn: () => handleGenerate("pageintro") },
      { key: "teasertitle", label: "Teaser Title", fn: () => handleGenerate("teasertitle") },
      { key: "abstract", label: "Abstract", fn: () => handleGenerate("abstract") },
      { key: "readmoretext", label: "Read More Text", fn: () => handleGenerate("readmoretext") },
      { key: "body", label: "Article Body", fn: () => handleGenerateBody() },
    ];
    if (post.sourceRaw || post.sourceSummarized) {
      steps.push({ key: "imagePrompt", label: "Image Prompt", fn: () => handleGenerateImagePrompt() });
    }

    const total = steps.length;
    for (let i = 0; i < steps.length; i++) {
      setGenerateAllProgress({ current: i, total, label: steps[i].label });
      try {
        await steps[i].fn();
      } catch {
        // individual handlers already toast errors
      }
    }
    setGenerateAllProgress(null);
  };

  // ─── Optimize Body Text ──────────────────────────────────────

  const handleOptimize = async () => {
    if (!optimizeInstruction.trim()) return;

    // Find the first richtext block
    const firstRichtext = bodyBlocks.find((b) => b.component === "richtext");
    if (!firstRichtext) {
      toast({ title: "No richtext block found", variant: "destructive" });
      return;
    }

    const editor = getRichtextEditor(firstRichtext._uid);
    if (!editor) {
      toast({ title: "Editor not available", variant: "destructive" });
      return;
    }

    // Check for selection
    const { from, to, empty } = editor.state.selection;
    const hasSelection = !empty;

    let textToOptimize: string;
    if (hasSelection) {
      textToOptimize = editor.state.doc.textBetween(from, to, "\n");
    } else {
      textToOptimize = editor.getText({ blockSeparator: "\n" });
    }

    if (!textToOptimize.trim()) {
      toast({ title: "No text to optimize", variant: "destructive" });
      return;
    }

    // Store snapshot for revert
    const snapshotContent = editor.getJSON();

    setOptimizing(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "optimize",
          text: textToOptimize,
          instruction: optimizeInstruction.trim(),
          isFullDocument: !hasSelection,
          modelId: transientModel || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Optimization failed");

      optimizeJustApplied.current = true;
      setOptimizeSnapshot({ blockUid: firstRichtext._uid, content: snapshotContent });

      if (hasSelection && data.optimizedText) {
        // Replace selection with optimized plain text
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, data.optimizedText).run();
      } else if (!hasSelection && data.bodyContent) {
        // Replace the entire editor content with the new ProseMirror JSON
        editor.commands.setContent(data.bodyContent);
      }

      toast({ title: "Text optimized", description: hasSelection ? "Selection replaced" : "Full text replaced" });
      setOptimizeOpen(false);
      setOptimizeInstruction("");
    } catch (error: any) {
      toast({ title: "Optimization failed", description: error.message, variant: "destructive" });
    } finally {
      setOptimizing(false);
    }
  };

  const handleRevertOptimize = () => {
    if (!optimizeSnapshot) return;
    const editor = getRichtextEditor(optimizeSnapshot.blockUid);
    if (!editor) return;
    optimizeJustApplied.current = true;
    editor.commands.setContent(optimizeSnapshot.content);
    setOptimizeSnapshot(null);
    toast({ title: "Optimization reverted" });
  };

  // ─── Header Image Generation ────────────────────────────────

  const handleGenerateImagePrompt = async () => {
    if (!post) return;
    setGeneratingImage("prompt");
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prompt",
          sourceRaw: post.sourceRaw,
          sourceSummarized: post.sourceSummarized,
          hint: transientPromptHint || undefined,
          modelId: transientModel || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate prompt");
      setImagePrompt(data.imagePrompt);
      toast({ title: "Image prompt generated" });
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingImage(null);
    }
  };

  const handleGenerateImage = async () => {
    if (!post) return;
    let prompt = imagePrompt.trim();

    // If no prompt yet, auto-generate one first
    if (!prompt) {
      setGeneratingImage("prompt");
      try {
        const promptRes = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "prompt",
            sourceRaw: post.sourceRaw,
            sourceSummarized: post.sourceSummarized,
            hint: transientPromptHint || undefined,
            modelId: transientModel || undefined,
          }),
        });
        const promptData = await promptRes.json();
        if (!promptRes.ok) throw new Error(promptData.error || "Failed to generate prompt");
        prompt = promptData.imagePrompt;
        setImagePrompt(prompt);
      } catch (error: any) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
        setGeneratingImage(null);
        return;
      }
    }

    // Now generate the image
    setGeneratingImage("image");
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "image", dallePrompt: prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image generation failed");
      setGeneratedImageBase64(data.base64);
      toast({ title: "Header image generated", description: "Image will be uploaded when you save." });
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    } finally {
      setGeneratingImage(null);
    }
  };

  // ─── Rendering ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Post not found</p>
        <Button variant="link" onClick={() => router.push("/posts")}>
          Back to posts
        </Button>
      </div>
    );
  }

  const hasSource = !!post.sourceRaw || !!post.sourceSummarized;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* ═══ LEFT COLUMN: Content ═══ */}
      <div className="space-y-6 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => router.push("/posts")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight truncate">
                {post.pagetitle || post.slug}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground truncate">
                  /{post.slug}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 shrink-0"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>

        {/* Header Picture */}
        <div className="animate-fade-in" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Header Picture</h2>
            {hasSource && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={async () => {
                    setImagePrompt("");
                    setGeneratedImageBase64(null);
                    // Regenerate prompt, then immediately generate the image
                    setGeneratingImage("prompt");
                    try {
                      const promptRes = await fetch("/api/ai/generate-image", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "prompt",
                          sourceRaw: post?.sourceRaw,
                          sourceSummarized: post?.sourceSummarized,
                          hint: transientPromptHint || undefined,
                          modelId: transientModel || undefined,
                        }),
                      });
                      const promptData = await promptRes.json();
                      if (!promptRes.ok) throw new Error(promptData.error || "Failed to generate prompt");
                      setImagePrompt(promptData.imagePrompt);

                      // Now generate the image with the new prompt
                      setGeneratingImage("image");
                      const imgRes = await fetch("/api/ai/generate-image", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "image", dallePrompt: promptData.imagePrompt }),
                      });
                      const imgData = await imgRes.json();
                      if (!imgRes.ok) throw new Error(imgData.error || "Image generation failed");
                      setGeneratedImageBase64(imgData.base64);
                      toast({ title: "Header image regenerated", description: "Image will be uploaded when you save." });
                    } catch (error: any) {
                      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
                    } finally {
                      setGeneratingImage(null);
                    }
                  }}
                  disabled={!!generatingImage}
                >
                  {generatingImage === "prompt" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Start Over
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleGenerateImage}
                  disabled={!!generatingImage}
                >
                  {generatingImage === "image" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5" />
                  )}
                  Generate Picture
                </Button>
              </div>
            )}
          </div>

          {/* Image preview */}
          {(generatedImageBase64 || headerPictureUrl) && (
            <div className="relative rounded-lg overflow-hidden border border-border/50 mb-3" style={{ aspectRatio: "4/1" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImageBase64 ? `data:image/png;base64,${generatedImageBase64}` : headerPictureUrl}
                alt="Header picture"
                className="w-full h-full object-cover object-center absolute inset-0"
              />
              {generatedImageBase64 && (
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
                    Unsaved — will upload on save
                  </Badge>
                </div>
              )}
            </div>
          )}

          {!generatedImageBase64 && !headerPictureUrl && (
            <div className="rounded-lg border border-dashed border-border/50 bg-secondary/10 p-8 text-center text-sm text-muted-foreground mb-3">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No header picture yet. Generate one using the image prompt in AI Settings.
            </div>
          )}
        </div>

        {/* Body Editor */}
        <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          {/* Generate Body Button */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Body Content</h2>
            <div className="flex items-center gap-2">
              {optimizeSnapshot && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={handleRevertOptimize}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert
                </Button>
              )}
              {bodyBlocks.some((b) => b.component === "richtext") && (
                <Button
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setOptimizeOpen(true)}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Optimize
                </Button>
              )}
              {hasSource && (
                <Button
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleGenerateBody()}
                  disabled={generating.has("body")}
                >
                  {generating.has("body") ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate Article
                </Button>
              )}
            </div>
          </div>
          <BodyEditor blocks={bodyBlocks} onChange={setBodyBlocks} />
        </div>

        {/* Actions moved to sidebar Status panel */}
      </div>

      {/* ═══ RIGHT COLUMN: Meta ═══ */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        {/* 1. AI Settings (Collapsible) */}
        <Collapsible open={showAiSettings} onOpenChange={setShowAiSettings}>
          <div className="rounded-lg border border-blue-500/30 bg-card p-4 space-y-3 animate-fade-in">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full hover:opacity-80 transition-opacity text-left">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <span className="font-medium text-sm text-blue-400">AI Settings</span>
                  {(transientModel || transientPromptHint) && (
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]"
                    >
                      Custom
                    </Badge>
                  )}
                </div>
                {showAiSettings ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="space-y-3 pt-2">
                {/* Model Selection */}
                <div className="rounded-lg border border-blue-500/20 p-3 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Model
                  </Label>
                  <Select
                    value={transientModel || "default"}
                    onValueChange={(value) =>
                      setTransientModel(value === "default" ? null : value)
                    }
                  >
                    <SelectTrigger className="bg-secondary/50 text-xs h-9 focus:ring-blue-500/40 focus:border-blue-500/50">
                      <SelectValue placeholder="Standard model">
                        {(() => {
                          const sel = aiModels.find(
                            (m) => m.id === transientModel
                          );
                          if (sel) {
                            return (
                              <span className="flex items-center justify-between w-full gap-2">
                                <span className="truncate">{sel.name}</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 shrink-0",
                                    PROVIDER_COLORS[sel.provider]
                                  )}
                                >
                                  {PROVIDER_LABELS[sel.provider]}
                                </Badge>
                              </span>
                            );
                          }
                          const def = aiModels.find(
                            (m) => m.id === defaultModel
                          );
                          return `Default (${def?.name || defaultModel || "not set"})`;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="text-xs">
                        Default (
                        {aiModels.find((m) => m.id === defaultModel)?.name ||
                          defaultModel ||
                          "not set"}
                        )
                      </SelectItem>
                      {aiModels.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          className="text-xs"
                        >
                          <span className="flex items-center justify-between w-full gap-2">
                            <span>{model.name}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 shrink-0",
                                PROVIDER_COLORS[model.provider]
                              )}
                            >
                              {PROVIDER_LABELS[model.provider]}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prompt Hint */}
                <div className="rounded-lg border border-blue-500/20 p-3 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Additional hint
                  </Label>
                  <Textarea
                    value={transientPromptHint}
                    onChange={(e) => setTransientPromptHint(e.target.value)}
                    onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                    placeholder="E.g. 'Focus on technical details', 'Style: casual'..."
                    className="resize-none overflow-hidden bg-secondary/50 text-xs focus-visible:ring-blue-500/40 focus-visible:border-blue-500/50"
                    rows={1}
                  />
                </div>

                {/* Image Prompt */}
                {hasSource && (
                  <div className="rounded-lg border border-blue-500/20 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Image Prompt (DALL-E)
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                        onClick={handleGenerateImagePrompt}
                        disabled={!!generatingImage}
                      >
                        {generatingImage === "prompt" ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        {imagePrompt ? "Regenerate" : "Generate"}
                      </Button>
                    </div>
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                      ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                      placeholder="Click 'Generate' to create a prompt from the source material, or write your own..."
                      className="resize-none overflow-hidden bg-secondary/50 text-xs focus-visible:ring-blue-500/40 focus-visible:border-blue-500/50"
                      rows={1}
                    />
                  </div>
                )}

                {/* Main Prompt (read-only) */}
                {mainPrompt && (
                  <div className="rounded-lg border border-blue-500/20 p-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Prompt
                    </Label>
                    <p className="text-[11px] text-muted-foreground/70 italic leading-relaxed">
                      &ldquo;{mainPrompt}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>

            {/* Generate All button - always visible */}
            {hasSource && (
              <div className="mt-2 space-y-2">
                <Button
                  size="sm"
                  variant="default"
                  className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleGenerateAll()}
                  disabled={generating.size > 0 || !!generateAllProgress}
                >
                  {generateAllProgress ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate All from Source
                </Button>
                {generateAllProgress && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{generateAllProgress.label}...</span>
                      <span>{generateAllProgress.current + 1}/{generateAllProgress.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${((generateAllProgress.current + 1) / generateAllProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Collapsible>

        {/* 2. Status & Actions */}
        <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Status</span>
          </div>
          {/* Content — button color = target state */}
          <div className="flex items-center justify-between">
            <StatusDot
              label={
                post.status.contentComplete.color === "green"
                  ? "Content complete"
                  : "Content incomplete"
              }
              color={post.status.contentComplete.color}
            />
            {post.status.contentComplete.completed ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-yellow-500 hover:bg-yellow-600 hover:text-white"
                onClick={handleToggleContentComplete}
                disabled={saving}
                title="Mark incomplete"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-500 hover:bg-green-600 hover:text-white"
                onClick={handleToggleContentComplete}
                disabled={saving}
                title="Mark complete"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Published — green = publish (positive), red = unpublish (destructive) */}
          <div className="flex items-center justify-between">
            <StatusDot
              label={
                post.status.published.color === "red"
                  ? "Not published"
                  : post.status.published.color === "yellow"
                    ? "Unpublished changes"
                    : "Published"
              }
              color={post.status.published.color}
            />
            <div className="flex items-center gap-1.5">
              {post.status.published.color === "red" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-green-500 hover:bg-green-600 hover:text-white"
                  onClick={handlePublish}
                  disabled={publishing}
                  title="Publish"
                >
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                </Button>
              )}
              {post.status.published.color === "yellow" && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-green-500 hover:bg-green-600 hover:text-white"
                    onClick={handlePublish}
                    disabled={publishing}
                    title="Publish changes"
                  >
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500 hover:bg-red-600 hover:text-white"
                    onClick={handleUnpublish}
                    disabled={publishing}
                    title="Unpublish"
                  >
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  </Button>
                </>
              )}
              {post.status.published.color === "green" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 hover:bg-red-600 hover:text-white"
                  onClick={handleUnpublish}
                  disabled={publishing}
                  title="Unpublish"
                >
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Meta Fields (Collapsible) */}
        <Collapsible open={showMetaFields} onOpenChange={setShowMetaFields}>
          <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3 animate-fade-in">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full hover:opacity-80 transition-opacity text-left">
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Meta Fields</span>
                </div>
                {showMetaFields ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="space-y-3 pt-2">
                {/* Slug */}
                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-xs text-muted-foreground">Slug</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="slug"
                        value={slugValue}
                        onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="url-slug"
                        className="bg-secondary/50 pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        {form.pagetitle && slugValue !== deriveSlug(form.pagetitle) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setSlugValue(deriveSlug(form.pagetitle))}
                            title="Generate from title"
                          >
                            <Wand2 className="h-3 w-3 text-blue-500" />
                          </Button>
                        )}
                        {slugValue !== originalSlug && originalSlug && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setSlugValue(originalSlug)}
                            title="Reset to original"
                          >
                            <RotateCcw className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {slugValue !== originalSlug && slugValue && (
                    <p className="text-xs text-primary">
                      Slug will change to: {slugValue}
                    </p>
                  )}
                </div>

                <FieldWithAI
                  label="Page Title"
                  id="pagetitle"
                  generating={generating}
                  onGenerate={() => handleGenerate("pagetitle")}
                >
                  <Input
                    id="pagetitle"
                    value={form.pagetitle}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, pagetitle: e.target.value }))
                    }
                    placeholder="Blog post title"
                  />
                </FieldWithAI>

                <FieldWithAI
                  label="Page Intro"
                  id="pageintro"
                  generating={generating}
                  onGenerate={() => handleGenerate("pageintro")}
                >
                  <Textarea
                    id="pageintro"
                    value={form.pageintro}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, pageintro: e.target.value }))
                    }
                    onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                    placeholder="Introduction text"
                    rows={1}
                    className="resize-none overflow-hidden"
                  />
                </FieldWithAI>

                <FieldWithAI
                  label="Teaser Title"
                  id="teasertitle"
                  generating={generating}
                  onGenerate={() => handleGenerate("teasertitle")}
                >
                  <Input
                    id="teasertitle"
                    value={form.teasertitle}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, teasertitle: e.target.value }))
                    }
                    placeholder="Teaser title for previews"
                  />
                </FieldWithAI>

                <FieldWithAI
                  label="Abstract"
                  id="abstract"
                  generating={generating}
                  onGenerate={() => handleGenerate("abstract")}
                >
                  <Textarea
                    id="abstract"
                    value={form.abstract}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, abstract: e.target.value }))
                    }
                    onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                    placeholder="Short summary / teaser text"
                    rows={1}
                    className="resize-none overflow-hidden"
                  />
                </FieldWithAI>

                <FieldWithAI
                  label="Read More Text"
                  id="readmoretext"
                  generating={generating}
                  onGenerate={() => handleGenerate("readmoretext")}
                >
                  <Input
                    id="readmoretext"
                    value={form.readmoretext}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        readmoretext: e.target.value,
                      }))
                    }
                    placeholder="Call to action text"
                  />
                </FieldWithAI>

                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-xs">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* 4. Source Material */}
        {hasSource && (
          <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Source Material</span>
              <Badge variant="secondary" className="text-[10px]">
                Read-only
              </Badge>
            </div>

            {post.sourceSummarized && (
              <Collapsible defaultOpen>
                <div className="flex items-center justify-between mb-1">
                  <CollapsibleTrigger className="flex items-center gap-1 text-left">
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=closed]_&]:-rotate-90" />
                    <Label className="text-xs text-muted-foreground cursor-pointer">
                      Summary
                    </Label>
                  </CollapsibleTrigger>
                  <button
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    onClick={() => {
                      setEditSummaryText(post.sourceSummarized || "");
                      setEditSummaryOpen(true);
                    }}
                    title="Edit summary"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                <CollapsibleContent>
                  <div className="source-markdown bg-secondary/30 rounded-md p-3 text-xs leading-relaxed max-h-64 overflow-y-auto mt-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                      {fixTables(post.sourceSummarized)}
                    </ReactMarkdown>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {post.sourceRaw && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 w-full text-left mb-1">
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=closed]_&]:-rotate-90" />
                  <Label className="text-xs text-muted-foreground cursor-pointer">
                    Raw Transcription
                  </Label>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="source-markdown bg-secondary/30 rounded-md p-3 text-xs leading-relaxed max-h-48 overflow-y-auto mt-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                      {fixTables(post.sourceRaw)}
                    </ReactMarkdown>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </div>

      {/* Optimize Text Dialog */}
      <Dialog open={optimizeOpen} onOpenChange={setOptimizeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Optimize Text</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const firstRichtext = bodyBlocks.find((b) => b.component === "richtext");
              if (!firstRichtext) return "No richtext block found.";
              const editor = getRichtextEditor(firstRichtext._uid);
              if (editor && !editor.state.selection.empty) {
                return "A text selection was detected. Only the selected text will be optimized.";
              }
              return "No selection detected. The entire first richtext block will be optimized.";
            })()}
          </p>
          <Textarea
            value={optimizeInstruction}
            onChange={(e) => setOptimizeInstruction(e.target.value)}
            placeholder="E.g. 'Make it more casual', 'Fix grammar', 'Shorten by half', 'Translate to English'..."
            className="min-h-[120px]"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOptimizeOpen(false)} disabled={optimizing}>
              Cancel
            </Button>
            <Button
              onClick={handleOptimize}
              disabled={optimizing || !optimizeInstruction.trim()}
              className="gap-2"
            >
              {optimizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Optimize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Summary Dialog */}
      <Dialog open={editSummaryOpen} onOpenChange={setEditSummaryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Summary</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editSummaryText}
            onChange={(e) => setEditSummaryText(e.target.value)}
            className="flex-1 min-h-[500px] font-mono text-xs resize-none"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditSummaryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!post) return;
                setSaving(true);
                try {
                  await fetch("/api/posts", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: post.storyblokId,
                      cm_source_summarized: editSummaryText,
                    }),
                  });
                  setEditSummaryOpen(false);
                  toast({ title: "Summary updated" });
                  await loadPost();
                } catch (error: any) {
                  toast({ title: "Failed", description: error.message, variant: "destructive" });
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────

function FieldWithAI({
  label,
  id,
  generating,
  onGenerate,
  children,
}: {
  label: string;
  id: string;
  generating: Set<string>;
  onGenerate: () => void;
  children: React.ReactNode;
}) {
  const isGenerating = generating.has(id);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Generate
        </Button>
      </div>
      {children}
    </div>
  );
}

function StatusDot({ label, color }: { label: string; color: string }) {
  const bgColor =
    color === "green"
      ? "bg-green-500/15"
      : color === "yellow"
        ? "bg-yellow-500/15"
        : color === "red"
          ? "bg-red-500/15"
          : "bg-gray-500/15";

  const iconColor =
    color === "green"
      ? "text-green-500"
      : color === "yellow"
        ? "text-yellow-500"
        : color === "red"
          ? "text-red-500"
          : "text-gray-400";

  const Icon =
    color === "green"
      ? CheckCircle
      : color === "yellow"
        ? AlertCircle
        : color === "red"
          ? XCircle
          : Circle;

  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", bgColor)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
