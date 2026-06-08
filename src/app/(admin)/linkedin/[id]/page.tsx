"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { LinkedinPost } from "@/types";
import { transformStoryblokLinkedin } from "@/lib/transform-storyblok";
import { LinkedinEditor, type BlogParentInfo } from "@/components/linkedin/LinkedinEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LinkedinDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<LinkedinPost | null>(null);
  const [parent, setParent] = useState<BlogParentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/linkedin/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast({ title: "LinkedIn post not found", variant: "destructive" });
          router.push("/linkedin");
          return;
        }
        throw new Error(`Failed to load (${response.status})`);
      }
      const data = await response.json();
      setPost(transformStoryblokLinkedin(data.story));
      setParent(data.parent || null);
    } catch (error: any) {
      toast({ title: "Failed to load LinkedIn post", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  if (loading && !post) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading LinkedIn post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">LinkedIn post not found</p>
        <Button variant="link" onClick={() => router.push("/linkedin")}>
          Back to LinkedIn
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", post.blogParentUuid ? "max-w-3xl" : "max-w-6xl")}>
      <div className="flex items-center gap-4 animate-fade-in">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/linkedin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight truncate">
            {post.blogParentUuid ? "Attached LinkedIn Post" : "Standalone LinkedIn Post"}
          </h1>
          <p className="text-sm text-muted-foreground">linkedin/{post.slug}</p>
        </div>
      </div>

      <LinkedinEditor
        post={post}
        parent={parent}
        onChanged={loadPost}
        onDeleted={() => router.push("/linkedin")}
      />
    </div>
  );
}
