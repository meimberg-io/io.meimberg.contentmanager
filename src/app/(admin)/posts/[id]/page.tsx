"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { BlogPost } from "@/types";
import { transformStoryblokBlog } from "@/lib/transform-storyblok";
import { StatusRow } from "@/components/ui/StatusIcon";
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
  ChevronDown,
  ChevronRight,
  FileText,
  PenLine,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

/** remark-gfm can't parse tables directly after list items – insert a blank line before them */
const fixTables = (s: string) => s.replace(/([^\n|])\n(\|)/g, '$1\n\n$2');

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
  const [generating, setGenerating] = useState<string | null>(null);

  // AI Settings
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [transientModel, setTransientModel] = useState<string | null>(null);
  const [transientPromptHint, setTransientPromptHint] = useState("");
  const [mainPrompt, setMainPrompt] = useState("");
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showMetaFields, setShowMetaFields] = useState(true);

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
      setBodyBlocks(transformed.body || []);
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

  // ─── Handlers ───────────────────────────────────────────────

  const handleSave = async () => {
    if (!post || !rawStory) return;
    setSaving(true);

    try {
      const response = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.storyblokId,
          ...form,
          body: bodyBlocks,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      toast({ title: "Saved successfully" });
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

  const handleGenerate = async (type: string) => {
    if (!post) return;
    setGenerating(type);

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

      // Update form with generated content
      if (type === "all") {
        setForm((prev) => ({
          ...prev,
          pagetitle: data.pagetitle || prev.pagetitle,
          pageintro: data.pageintro || prev.pageintro,
          teasertitle: data.teasertitle || prev.teasertitle,
          abstract: data.abstract || prev.abstract,
          readmoretext: data.readmoretext || prev.readmoretext,
        }));
      } else if (data[type] !== undefined) {
        setForm((prev) => ({ ...prev, [type]: data[type] }));
      }

      toast({
        title: "Content generated",
        description: `Generated ${type === "all" ? "all fields" : type} using ${data.modelUsed}`,
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateBody = async () => {
    if (!post) return;
    setGenerating("body");

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
        // Create a richtext block with the generated content
        const newBlock = {
          _uid: crypto.randomUUID().replace(/-/g, "").substring(0, 36),
          component: "richtext",
          content: data.bodyContent,
        };

        // Insert at the top of body blocks
        setBodyBlocks((prev) => [newBlock, ...prev]);

        toast({
          title: "Article generated",
          description: `Body content generated using ${data.modelUsed}. Don't forget to save!`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
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
                <StatusRow status={post.status} size="md" />
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

        {/* Body Editor */}
        <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          {/* Generate Body Button */}
          {hasSource && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">Body Content</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300"
                onClick={() => handleGenerateBody()}
                disabled={!!generating}
              >
                {generating === "body" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate Article
              </Button>
            </div>
          )}
          {!hasSource && (
            <h2 className="font-display text-lg font-semibold mb-3">Body Content</h2>
          )}
          <BodyEditor blocks={bodyBlocks} onChange={setBodyBlocks} />
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between pt-4 border-t border-border/50 animate-fade-in"
          style={{ animationDelay: "150ms" }}
        >
          {/* Content Complete Toggle */}
          <Button
            variant={
              post.status.contentComplete.completed ? "secondary" : "outline"
            }
            className="gap-2"
            onClick={handleToggleContentComplete}
            disabled={saving}
          >
            {post.status.contentComplete.completed ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                Content Complete
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-muted-foreground" />
                Mark as Complete
              </>
            )}
          </Button>

          {/* Publish Controls */}
          <div className="flex items-center gap-2">
            {post.status.published.completed ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleUnpublish}
                disabled={publishing}
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GlobeIcon className="h-4 w-4 text-green-500" />
                )}
                Published — Unpublish
              </Button>
            ) : (
              <Button
                variant="default"
                className="gap-2"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                Publish to Storyblok
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT COLUMN: Meta ═══ */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        {/* Source Material */}
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
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Summary
                </Label>
                <div className="source-markdown bg-secondary/30 rounded-md p-3 text-xs leading-relaxed max-h-64 overflow-y-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {fixTables(post.sourceSummarized)}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {post.sourceRaw && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Raw Transcription
                </Label>
                <div className="source-markdown bg-secondary/30 rounded-md p-3 text-xs leading-relaxed max-h-48 overflow-y-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {fixTables(post.sourceRaw)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Settings (Collapsible) */}
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
                    placeholder="E.g. 'Focus on technical details', 'Style: casual'..."
                    className="resize-none bg-secondary/50 text-xs focus-visible:ring-blue-500/40 focus-visible:border-blue-500/50"
                    rows={2}
                  />
                </div>

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
              <Button
                size="sm"
                variant="default"
                className="w-full gap-1.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleGenerate("all")}
                disabled={!!generating}
              >
                {generating === "all" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate All from Source
              </Button>
            )}
          </div>
        </Collapsible>

        {/* Meta Fields (Collapsible) */}
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
                    className="text-sm"
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
                    placeholder="Introduction text"
                    rows={2}
                    className="text-sm"
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
                    className="text-sm"
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
                    placeholder="Short summary / teaser text"
                    rows={2}
                    className="text-sm"
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
                    className="text-sm"
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
                    className="text-sm"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Status Overview */}
        <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3 animate-fade-in">
          <span className="font-medium text-sm">Status</span>
          <div className="space-y-2">
            <StatusItem
              label="Content"
              color={post.status.contentComplete.color}
              text={
                post.status.contentComplete.completed
                  ? "Complete"
                  : post.status.contentComplete.color === "yellow"
                    ? "Fields filled"
                    : "Incomplete"
              }
            />
            <StatusItem
              label="Published"
              color={post.status.published.color}
              text={
                post.status.published.completed
                  ? "Published"
                  : "Draft"
              }
            />
            <StatusItem
              label="Publer"
              color={post.status.publishedPubler.color}
              text={
                post.status.publishedPubler.completed
                  ? "Shared"
                  : "Not shared"
              }
            />
          </div>
          <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground space-y-0.5">
            <div>
              Header Picture:{" "}
              {post.headerpicture ? (
                <span className="text-green-500">Set</span>
              ) : (
                <span className="text-red-400">Not set</span>
              )}
            </div>
            <div>
              Teaser Image:{" "}
              {post.teaserimage ? (
                <span className="text-green-500">Set</span>
              ) : (
                <span className="text-red-400">Not set</span>
              )}
            </div>
            <div>
              Body:{" "}
              {bodyBlocks.length > 0 ? (
                <span className="text-green-500">
                  {bodyBlocks.length} block{bodyBlocks.length !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-red-400">Empty</span>
              )}
            </div>
          </div>
        </div>
      </div>
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
  generating: string | null;
  onGenerate: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          onClick={onGenerate}
          disabled={!!generating}
        >
          {generating === id ? (
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

function StatusItem({
  label,
  color,
  text,
}: {
  label: string;
  color: string;
  text: string;
}) {
  const dotColor =
    color === "green"
      ? "bg-green-500"
      : color === "yellow"
        ? "bg-yellow-500"
        : color === "red"
          ? "bg-red-500"
          : "bg-gray-400";

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={cn("h-2 w-2 rounded-full", dotColor)} />
        <span className="text-xs">{text}</span>
      </div>
    </div>
  );
}
