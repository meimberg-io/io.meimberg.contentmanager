"use client";

import { PostCard } from "@/components/posts/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search,
  LayoutGrid,
  List,
  X,
  Filter,
  Check,
  ChevronDown,
  Trash2,
} from "lucide-react";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// Multi-state status filter (per dimension).
interface StatusFilter {
  red: boolean;
  yellow: boolean;
  green: boolean;
}

interface MultiStateFilters {
  contentComplete: StatusFilter;
  published: StatusFilter;
  linkedin: StatusFilter;
}

type DimCounts = { red: number; yellow: number; green: number };
interface ViewCounts {
  contentComplete: DimCounts;
  published: DimCounts;
  linkedin: DimCounts;
}

const defaultFilter: StatusFilter = { red: false, yellow: false, green: false };
const emptyCounts: ViewCounts = {
  contentComplete: { red: 0, yellow: 0, green: 0 },
  published: { red: 0, yellow: 0, green: 0 },
  linkedin: { red: 0, yellow: 0, green: 0 },
};

function serializeFilter(filter: StatusFilter): string {
  let s = '';
  if (filter.red) s += 'r';
  if (filter.yellow) s += 'y';
  if (filter.green) s += 'g';
  return s;
}

function deserializeFilter(param: string | null): StatusFilter {
  if (!param) return { ...defaultFilter };
  return {
    red: param.includes('r'),
    yellow: param.includes('y'),
    green: param.includes('g'),
  };
}

function FilterButton({
  color,
  active,
  count,
  onClick
}: {
  color: 'red' | 'yellow' | 'green';
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  const bgColors = {
    red: active ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/40',
    yellow: active ? 'bg-yellow-500 text-black' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40',
    green: active ? 'bg-green-500 text-white' : 'bg-green-500/20 text-green-400 hover:bg-green-500/40',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center cursor-pointer",
        bgColors[color]
      )}
    >
      {active ? <Check className="h-3 w-3" /> : (count ?? '')}
    </button>
  );
}

function StatusFilterGrid({
  filters,
  onChange,
  counts
}: {
  filters: MultiStateFilters;
  onChange: (key: keyof MultiStateFilters, filter: StatusFilter) => void;
  counts: ViewCounts;
}) {
  const rows: { key: keyof MultiStateFilters; label: string; hasYellow: boolean }[] = [
    { key: 'contentComplete', label: 'Content', hasYellow: true },
    { key: 'published', label: 'Published', hasYellow: false },
    // LinkedIn dot: red button = no LinkedIn post (gray), yellow = in progress/scheduled, green = published.
    { key: 'linkedin', label: 'LinkedIn', hasYellow: true },
  ];

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-2 items-center">
      {rows.map(({ key, label, hasYellow }) => (
        <React.Fragment key={key}>
          <span className="text-sm">{label}</span>
          <FilterButton
            color="red"
            active={filters[key].red}
            count={counts[key].red}
            onClick={() => onChange(key, { ...filters[key], red: !filters[key].red })}
          />
          {hasYellow ? (
            <FilterButton
              color="yellow"
              active={filters[key].yellow}
              count={counts[key].yellow}
              onClick={() => onChange(key, { ...filters[key], yellow: !filters[key].yellow })}
            />
          ) : (
            <div className="min-w-[28px] h-7" />
          )}
          <FilterButton
            color="green"
            active={filters[key].green}
            count={counts[key].green}
            onClick={() => onChange(key, { ...filters[key], green: !filters[key].green })}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

const UNPUBLISHED = 'unpublished';

// View picker (MICM): single-select, mutually exclusive — "Unveröffentlichte" or one year.
// Replaces pagination — selecting a year fetches only that year's posts server-side.
function ViewPicker({
  scope,
  years,
  onSelect,
}: {
  scope: string;
  years: number[];
  onSelect: (value: string) => void;
}) {
  const item = (value: string, label: string) => (
    <button
      key={value}
      onClick={() => onSelect(value)}
      className={cn(
        "w-full text-left h-8 px-3 rounded-md text-sm transition-all cursor-pointer",
        scope === value
          ? "bg-secondary text-foreground font-medium"
          : "text-muted-foreground hover:bg-secondary/60"
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="space-y-1">
      {item(UNPUBLISHED, 'Unveröffentlichte')}
      {years.map((y) => item(String(y), String(y)))}
    </div>
  );
}

function AllPostsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<MultiStateFilters>({
    contentComplete: { ...defaultFilter },
    published: { ...defaultFilter },
    linkedin: { ...defaultFilter },
  });
  // Single-select data scope: 'unpublished' (worklist) or a 4-digit year.
  const [scope, setScope] = useState<string>(UNPUBLISHED);
  const [posts, setPosts] = useState<any[]>([]);
  const [counts, setCounts] = useState<ViewCounts>(emptyCounts);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Sync state FROM URL
  useEffect(() => {
    setViewMode(searchParams.get('view') === 'grid' ? 'grid' : 'list');
    setSearchQuery(searchParams.get('q') || '');
    setScope(searchParams.get('scope') || UNPUBLISHED);
    setFilters({
      contentComplete: deserializeFilter(searchParams.get('content')),
      published: deserializeFilter(searchParams.get('published')),
      linkedin: deserializeFilter(searchParams.get('linkedin')),
    });
    setIsInitialized(true);
  }, [searchParams]);

  // Sync state TO URL (debounced)
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      const content = serializeFilter(filters.contentComplete);
      const published = serializeFilter(filters.published);
      const linkedin = serializeFilter(filters.linkedin);

      if (content) params.set('content', content);
      if (published) params.set('published', published);
      if (linkedin) params.set('linkedin', linkedin);
      if (searchQuery) params.set('q', searchQuery);
      if (viewMode === 'grid') params.set('view', 'grid');
      if (scope !== UNPUBLISHED) params.set('scope', scope);

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, searchQuery, viewMode, scope, pathname, router, isInitialized]);

  // Fetch the server-filtered list whenever scope / filters / search change (debounced).
  useEffect(() => {
    if (!isInitialized) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('scope', scope);
        const content = serializeFilter(filters.contentComplete);
        const published = serializeFilter(filters.published);
        const linkedin = serializeFilter(filters.linkedin);
        if (content) params.set('content', content);
        if (published) params.set('published', published);
        if (linkedin) params.set('linkedin', linkedin);
        if (searchQuery) params.set('q', searchQuery);

        const res = await fetch(`/api/posts/list?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to fetch posts (${res.status})`);
        const data = await res.json();
        setPosts(data.posts || []);
        setCounts(data.counts || emptyCounts);
        if (Array.isArray(data.availableYears)) setAvailableYears(data.availableYears);
      } catch (error: any) {
        if (error?.name !== 'AbortError') console.error('Failed to load posts:', error);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [scope, filters, searchQuery, isInitialized]);

  const handleSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedPosts);
    if (selected) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedPosts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map((p) => p.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPosts.size === 0 || deleting) return;

    setDeleting(true);
    try {
      const selectedIds = new Set(selectedPosts);
      const selectedStoryblokIds = posts
        .filter((p) => selectedIds.has(p.id))
        .map((p) => p.storyblokId)
        .filter(Boolean);

      for (const storyblokId of selectedStoryblokIds) {
        const response = await fetch(`/api/posts?id=${encodeURIComponent(String(storyblokId))}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed to delete post ${storyblokId}`);
        }
      }

      setPosts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedPosts(new Set());
      setConfirmDeleteOpen(false);
      toast({
        title: "Posts deleted",
        description: `${selectedIds.size} post${selectedIds.size === 1 ? "" : "s"} deleted successfully.`,
      });
    } catch (error) {
      console.error("Failed to delete selected posts:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete one or more posts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      contentComplete: { ...defaultFilter },
      published: { ...defaultFilter },
      linkedin: { ...defaultFilter },
    });
    setSearchQuery("");
    setScope(UNPUBLISHED);
  };

  const isFilterActive = (f: StatusFilter) => f.red || f.yellow || f.green;
  const hasActiveFilters =
    Object.values(filters).some(isFilterActive) || !!searchQuery || scope !== UNPUBLISHED;

  const sidebarBody = (
    <>
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Ansicht</h3>
        <ViewPicker scope={scope} years={availableYears} onSelect={setScope} />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Status</h3>
        <StatusFilterGrid
          filters={filters}
          onChange={(key, f) => setFilters((prev) => ({ ...prev, [key]: f }))}
          counts={counts}
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear all filters
        </Button>
      )}
    </>
  );

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading posts from Storyblok...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar Filters - Desktop */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 space-y-6 glass-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50"
            />
          </div>
          {sidebarBody}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">All Posts</h1>
            <p className="text-muted-foreground mt-1">
              Showing {posts.length} posts
            </p>
          </div>

          <Button
            variant="outline"
            className="lg:hidden gap-2"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
          </Button>
        </div>

        {filterOpen && (
          <div className="lg:hidden glass-card space-y-6 animate-scale-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary/50"
              />
            </div>
            {sidebarBody}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="ml-2" onClick={handleSelectAll}>
              {selectedPosts.size === posts.length && posts.length > 0 ? "Deselect All" : "Select All"}
            </Button>
            {selectedPosts.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-2 gap-2" disabled={deleting}>
                    Actions ({selectedPosts.size})
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover">
                  <DropdownMenuItem
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="text-red-400 focus:text-red-300"
                    disabled={deleting}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected posts?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedPosts.size} post{selectedPosts.size === 1 ? "" : "s"}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Post Grid/List */}
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr"
              : "space-y-3"
          )}
        >
          {posts.map((post, index) => (
            <div
              key={post.id}
              className={cn("animate-slide-up", viewMode === "grid" && "h-full")}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PostCard
                post={post}
                viewMode={viewMode}
                isSelected={selectedPosts.has(post.id)}
                onSelect={handleSelect}
                hideActions
                selectionMode={selectedPosts.size > 0}
                scheduledAt={post.scheduledAt}
                linkedinStatus={post.linkedinStatus}
              />
            </div>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts match your filters</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AllPostsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    }>
      <AllPostsPageContent />
    </Suspense>
  );
}
