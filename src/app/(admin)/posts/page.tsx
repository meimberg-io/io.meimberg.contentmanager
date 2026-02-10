"use client";

import { PostCard } from "@/components/posts/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { transformStoryblokBlog } from "@/lib/transform-storyblok";
import { toast } from "@/hooks/use-toast";

// Multi-state filter
interface StatusFilter {
  red: boolean;
  yellow: boolean;
  green: boolean;
}

interface MultiStateFilters {
  contentComplete: StatusFilter;
  published: StatusFilter;
  publishedPubler: StatusFilter;
}

const defaultFilter: StatusFilter = { red: false, yellow: false, green: false };

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
        "min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center",
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
  counts: {
    contentComplete: { red: number; yellow: number; green: number };
    published: { red: number; yellow: number; green: number };
    publishedPubler: { red: number; yellow: number; green: number };
  };
}) {
  const rows: { key: keyof MultiStateFilters; label: string; hasYellow: boolean }[] = [
    { key: 'contentComplete', label: 'Content', hasYellow: true },
    { key: 'published', label: 'Published', hasYellow: false },
    { key: 'publishedPubler', label: 'Publer', hasYellow: false },
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
    publishedPubler: { ...defaultFilter },
  });
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Sync state FROM URL
  useEffect(() => {
    const urlView = searchParams.get('view');
    const urlSearch = searchParams.get('q') || '';
    const urlFilters = {
      contentComplete: deserializeFilter(searchParams.get('content')),
      published: deserializeFilter(searchParams.get('published')),
      publishedPubler: deserializeFilter(searchParams.get('publer')),
    };

    setViewMode(urlView === 'grid' ? 'grid' : 'list');
    setSearchQuery(urlSearch);
    setFilters(urlFilters);
    setIsInitialized(true);
  }, [searchParams]);

  // Sync state TO URL
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      
      const content = serializeFilter(filters.contentComplete);
      const published = serializeFilter(filters.published);
      const publer = serializeFilter(filters.publishedPubler);
      
      if (content) params.set('content', content);
      if (published) params.set('published', published);
      if (publer) params.set('publer', publer);
      if (searchQuery) params.set('q', searchQuery);
      if (viewMode === 'grid') params.set('view', 'grid');
      
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      
      router.replace(newUrl, { scroll: false });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, searchQuery, viewMode, pathname, router, isInitialized]);

  const handleSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedPosts);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedPosts(newSelected);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/posts');
        if (!response.ok) {
          throw new Error(`Failed to fetch posts (${response.status})`);
        }
        const data = await response.json();
        
        const transformedPosts = (data.posts || []).map(transformStoryblokBlog);
        setPosts(transformedPosts);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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
      publishedPubler: { ...defaultFilter },
    });
    setSearchQuery("");
    router.replace(pathname, { scroll: false });
  };

  const isFilterActive = (f: StatusFilter) => f.red || f.yellow || f.green;
  const hasActiveFilters = Object.values(filters).some(isFilterActive) || searchQuery;

  const matchesStatusFilter = (status: { completed: boolean; color: string }, filter: StatusFilter): boolean => {
    if (!filter.red && !filter.yellow && !filter.green) return true;
    const { color } = status;
    if (filter.green && color === 'green') return true;
    if (filter.yellow && color === 'yellow') return true;
    if (filter.red && (color === 'red' || color === 'gray')) return true;
    return false;
  };

  const getStatusCounts = (statusKey: keyof MultiStateFilters) => {
    const baseFiltered = posts.filter(post => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          post.pagetitle.toLowerCase().includes(query) ||
          post.abstract.toLowerCase().includes(query) ||
          post.teasertitle.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      const otherFilters = {
        contentComplete: statusKey !== 'contentComplete' ? filters.contentComplete : defaultFilter,
        published: statusKey !== 'published' ? filters.published : defaultFilter,
        publishedPubler: statusKey !== 'publishedPubler' ? filters.publishedPubler : defaultFilter,
      };
      
      if (!matchesStatusFilter(post.status.contentComplete, otherFilters.contentComplete)) return false;
      if (!matchesStatusFilter(post.status.published, otherFilters.published)) return false;
      if (!matchesStatusFilter(post.status.publishedPubler, otherFilters.publishedPubler)) return false;
      
      return true;
    });
    
    let red = 0, yellow = 0, green = 0;
    baseFiltered.forEach(post => {
      const color = post.status[statusKey].color;
      if (color === 'green') green++;
      else if (color === 'yellow') yellow++;
      else red++;
    });
    
    return { red, yellow, green };
  };

  const contentCounts = getStatusCounts('contentComplete');
  const publishedCounts = getStatusCounts('published');
  const publerCounts = getStatusCounts('publishedPubler');

  const filteredPosts = posts.filter((post) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        post.pagetitle.toLowerCase().includes(query) ||
        post.abstract.toLowerCase().includes(query) ||
        post.teasertitle.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (!matchesStatusFilter(post.status.contentComplete, filters.contentComplete)) return false;
    if (!matchesStatusFilter(post.status.published, filters.published)) return false;
    if (!matchesStatusFilter(post.status.publishedPubler, filters.publishedPubler)) return false;

    return true;
  });

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

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Status</h3>
            <StatusFilterGrid
              filters={filters}
              onChange={(key, f) => setFilters(prev => ({ ...prev, [key]: f }))}
              counts={{
                contentComplete: contentCounts,
                published: publishedCounts,
                publishedPubler: publerCounts,
              }}
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Sort by</h3>
            <Select defaultValue="date-newest">
              <SelectTrigger className="bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="name-asc">Title (A-Z)</SelectItem>
                <SelectItem value="name-desc">Title (Z-A)</SelectItem>
                <SelectItem value="date-newest">Date (Newest)</SelectItem>
                <SelectItem value="date-oldest">Date (Oldest)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Clear all filters
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">All Posts</h1>
            <p className="text-muted-foreground mt-1">
              Showing {filteredPosts.length} posts
            </p>
          </div>

          <Button
            variant="outline"
            className="lg:hidden gap-2"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>

        {filterOpen && (
          <div className="lg:hidden glass-card space-y-4 animate-scale-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary/50"
              />
            </div>
            <StatusFilterGrid
              filters={filters}
              onChange={(key, f) => setFilters(prev => ({ ...prev, [key]: f }))}
              counts={{
                contentComplete: contentCounts,
                published: publishedCounts,
                publishedPubler: publerCounts,
              }}
            />
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
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={handleSelectAll}
            >
              {selectedPosts.size === posts.length ? "Deselect All" : "Select All"}
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
          {filteredPosts.map((post, index) => (
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
              />
            </div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts match your filters</p>
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
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
