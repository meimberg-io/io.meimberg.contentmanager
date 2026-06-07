"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LinkedinPost } from "@/types";
import { LinkedinCard } from "@/components/linkedin/LinkedinCard";
import type { BlogParentInfo } from "@/components/linkedin/LinkedinEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type StatusColor = "red" | "yellow" | "green";

export default function LinkedinListPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<LinkedinPost[]>([]);
  const [parents, setParents] = useState<Record<string, BlogParentInfo>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Record<StatusColor, boolean>>({
    red: false,
    yellow: false,
    green: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/linkedin");
      if (!response.ok) throw new Error(`Failed to fetch (${response.status})`);
      const data = await response.json();
      setPosts(data.posts || []);
      setParents(data.parents || {});
    } catch (error) {
      console.error("Failed to load LinkedIn posts:", error);
      toast({ title: "Failed to load LinkedIn posts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStandalone = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cm_origin: "create" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Create failed");
      const newId = data.story?.id;
      if (newId) {
        router.push(`/linkedin/${newId}`);
      } else {
        await loadData();
      }
    } catch (error: any) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const anyStatusActive = statusFilter.red || statusFilter.yellow || statusFilter.green;
  const filtered = posts.filter((post) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!post.linkedinText.toLowerCase().includes(q)) return false;
    }
    if (anyStatusActive) {
      const c = post.status.contentComplete.color;
      const matches =
        (statusFilter.green && c === "green") ||
        (statusFilter.yellow && c === "yellow") ||
        (statusFilter.red && (c === "red" || c === "gray"));
      if (!matches) return false;
    }
    return true;
  });

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading LinkedIn posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar Filters */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 space-y-6 glass-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search LinkedIn posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50"
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Content status</h3>
            <div className="flex items-center gap-2">
              {(["red", "yellow", "green"] as StatusColor[]).map((color) => (
                <button
                  key={color}
                  onClick={() => setStatusFilter((prev) => ({ ...prev, [color]: !prev[color] }))}
                  className={cn(
                    "min-w-[32px] h-7 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center",
                    color === "red" &&
                      (statusFilter.red ? "bg-red-500 text-white" : "bg-red-500/20 text-red-400 hover:bg-red-500/40"),
                    color === "yellow" &&
                      (statusFilter.yellow ? "bg-yellow-500 text-black" : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40"),
                    color === "green" &&
                      (statusFilter.green ? "bg-green-500 text-white" : "bg-green-500/20 text-green-400 hover:bg-green-500/40"),
                  )}
                >
                  {statusFilter[color] ? <Check className="h-3 w-3" /> : ""}
                </button>
              ))}
            </div>
          </div>

          {(anyStatusActive || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setStatusFilter({ red: false, yellow: false, green: false });
                setSearchQuery("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">LinkedIn</h1>
            <p className="text-muted-foreground mt-1">Showing {filtered.length} posts</p>
          </div>
          <Button className="gap-2" onClick={handleCreateStandalone} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New standalone post
          </Button>
        </div>

        <div className="space-y-3">
          {filtered.map((post, index) => (
            <div
              key={post.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <LinkedinCard post={post} parent={post.blogParentUuid ? parents[post.blogParentUuid] : undefined} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No LinkedIn posts yet</p>
            <Button variant="link" onClick={handleCreateStandalone} className="mt-2" disabled={creating}>
              Create your first standalone post
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
