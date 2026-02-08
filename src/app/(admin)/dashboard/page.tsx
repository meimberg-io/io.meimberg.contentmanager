"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Globe, Smartphone, Upload, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { transformStoryblokBlog } from "@/lib/transform-storyblok";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPosts: 0,
    contentComplete: 0,
    published: 0,
    socialMediaPosts: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/posts?perPage=100');
        const data = await response.json();
        
        const stories = data.posts || [];
        const transformedPosts = stories.map(transformStoryblokBlog);
        
        setStats({
          totalPosts: stories.length,
          contentComplete: transformedPosts.filter((p: any) => p.status.contentComplete.completed).length,
          published: transformedPosts.filter((p: any) => p.status.published.completed).length,
          socialMediaPosts: transformedPosts.filter((p: any) => p.status.publishedPubler.completed).length
        });

        const sortedPosts = [...transformedPosts].sort((a: any, b: any) => {
          const aTime = new Date(a.lastModified).getTime();
          const bTime = new Date(b.lastModified).getTime();
          return bTime - aTime;
        });

        const activities = sortedPosts.slice(0, 5).map((post: any) => ({
          id: post.id,
          postId: post.id,
          postTitle: post.pagetitle || post.slug || 'Untitled',
          action: getLatestAction(post),
          timestamp: post.lastModified || post.createdAt,
          status: getActivityStatus(post)
        }));
        
        setRecentActivity(activities);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function getLatestAction(post: any) {
    if (post.status.publishedPubler.completed) return 'Published to social media';
    if (post.status.published.completed) return 'Published to website';
    if (post.status.contentComplete.completed) return 'Content completed';
    if (post.status.contentComplete.color === 'yellow') return 'Content in progress';
    return 'Post created';
  }

  function getActivityStatus(post: any): 'success' | 'warning' | 'error' | 'info' {
    if (post.status.published.completed) return 'success';
    if (post.status.contentComplete.completed) return 'warning';
    return 'info';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your blog content and recent activity
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Posts"
          value={stats.totalPosts}
          icon={FileText}
          variant="blue"
          className="animate-slide-up"
        />
        <StatCard
          title="Content Complete"
          value={stats.contentComplete}
          icon={CheckCircle}
          variant="yellow"
          className="animate-slide-up"
          style={{ animationDelay: "50ms" }}
        />
        <StatCard
          title="Published"
          value={stats.published}
          icon={Globe}
          variant="green"
          className="animate-slide-up"
          style={{ animationDelay: "100ms" }}
        />
        <StatCard
          title="Social Media Posts"
          value={stats.socialMediaPosts}
          icon={Smartphone}
          variant="purple"
          className="animate-slide-up"
          style={{ animationDelay: "150ms" }}
        />
      </div>

      <div className="flex flex-wrap gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <Link href="/import">
          <Button size="lg" className="gap-2 gold-glow">
            <Upload className="h-5 w-5" />
            Import from Inbox
          </Button>
        </Link>
        <Link href="/posts">
          <Button size="lg" variant="secondary" className="gap-2">
            <FolderOpen className="h-5 w-5" />
            View All Posts
          </Button>
        </Link>
      </div>

      <div className="space-y-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Recent Activity</h2>
          <Link href="/posts">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </div>
        <ActivityList activities={recentActivity} />
      </div>
    </div>
  );
}
