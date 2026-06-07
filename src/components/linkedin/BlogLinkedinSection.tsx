"use client";

import { useCallback, useEffect, useState } from "react";
import { LinkedinPost } from "@/types";
import { LinkedinEditor, type BlogParentInfo } from "@/components/linkedin/LinkedinEditor";
import { Button } from "@/components/ui/button";
import { Linkedin, Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BlogLinkedinSectionProps {
  blogUuid: string;
  blogSlug: string;
  blogTitle: string;
}

/**
 * LinkedIn area inside the blog detail (MICM-10 AK5/AK6). Shows the LinkedIn
 * posts attached to this blog (cm_blog_ref == blog UUID) and lets you create/attach
 * a new one. Attached posts are edited inline via the SAME LinkedinEditor used on
 * /linkedin/[id] — no second edit implementation.
 */
export function BlogLinkedinSection({ blogUuid, blogSlug, blogTitle }: BlogLinkedinSectionProps) {
  const [posts, setPosts] = useState<LinkedinPost[]>([]);
  const [parent, setParent] = useState<BlogParentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!blogUuid) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/linkedin?blogUuid=${encodeURIComponent(blogUuid)}`);
      if (!response.ok) throw new Error(`Failed to fetch (${response.status})`);
      const data = await response.json();
      setPosts(data.posts || []);
      setParent(data.parent || null);
    } catch (error: any) {
      toast({ title: "Failed to load attached LinkedIn posts", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [blogUuid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateAttach = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogParentUuid: blogUuid,
          name: `LinkedIn: ${blogTitle || blogSlug}`,
          cm_origin: "create",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Create failed");
      toast({ title: "LinkedIn post created", description: "Attached to this blog. Source material was mirrored." });
      await load();
    } catch (error: any) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Linkedin className="h-5 w-5 text-[#0a66c2]" />
          LinkedIn
        </h2>
        <Button
          size="sm"
          className="gap-2 bg-[#0a66c2] hover:bg-[#0a66c2]/90 text-white"
          onClick={handleCreateAttach}
          disabled={creating}
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Create LinkedIn post
        </Button>
      </div>

      {loading && posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 bg-secondary/10 p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin opacity-50" />
          Loading attached LinkedIn posts...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 bg-secondary/10 p-6 text-center text-sm text-muted-foreground">
          No LinkedIn post attached yet. Create one to promote this blog on LinkedIn.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <LinkedinEditor
              key={post.id}
              post={post}
              parent={parent}
              compact
              onChanged={load}
              onDeleted={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
