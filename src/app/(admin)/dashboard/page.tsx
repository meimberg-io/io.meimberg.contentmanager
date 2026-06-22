"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Globe, Upload, FolderOpen, PlusCircle } from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import Link from "next/link";
import { useEffect, useState } from "react";
import { transformStoryblokBlog } from "@/lib/transform-storyblok";
import { buildLinkedinStatusByBlog } from "@/lib/linkedin-status";
import { ymdInZone } from "@/lib/schedule-time";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPosts: 0,
    contentComplete: 0,
    published: 0,
    linkedinPosts: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [response, scheduleRes, linkedinRes] = await Promise.all([
          fetch('/api/posts?perPage=100'),
          fetch('/api/schedule').catch(() => null),
          fetch('/api/linkedin').catch(() => null),
        ]);
        const data = await response.json();

        const stories = data.posts || [];
        const transformedPosts = stories.map(transformStoryblokBlog);

        // Map storyUuid -> derived slot publish date for scheduled posts (MICM-30/32).
        const scheduledMap: Record<string, string> = {};
        if (scheduleRes && scheduleRes.ok) {
          const sched = await scheduleRes.json();
          for (const s of sched.schedules || []) {
            for (const inst of s.instances || []) {
              if (inst.status === 'pending' && !inst.isOrphan && inst.date) {
                scheduledMap[inst.storyUuid] = ymdInZone(new Date(inst.date), s.timezone || 'Europe/Berlin');
              }
            }
          }
        }

        // Join: blog UUID -> status of its attached LinkedIn post(s), same definition as
        // the posts list. "LinkedIn" counts blogs whose attached post is published (green).
        let linkedinByBlog: Record<string, { color: string }> = {};
        if (linkedinRes && linkedinRes.ok) {
          const li = await linkedinRes.json();
          linkedinByBlog = buildLinkedinStatusByBlog(li.posts || [], (uuid) => !!scheduledMap[uuid]);
        }

        setStats({
          totalPosts: stories.length,
          // MICM-37: "content done" = all required fields filled (pipeline yellow+),
          // not the dropped manual-confirm flag. color !== 'red' ⇔ content present.
          contentComplete: transformedPosts.filter((p: any) => p.status.contentComplete.color !== 'red').length,
          published: transformedPosts.filter((p: any) => p.status.published.completed).length,
          linkedinPosts: transformedPosts.filter((p: any) => linkedinByBlog[p.id]?.color === 'green').length
        });

        const sortedPosts = [...transformedPosts].sort((a: any, b: any) => {
          const aTime = new Date(a.lastModified).getTime();
          const bTime = new Date(b.lastModified).getTime();
          return bTime - aTime;
        });

        const activities = sortedPosts.slice(0, 5).map((post: any) => ({
          id: post.id,
          postId: post.slug,
          postTitle: post.pagetitle || post.slug || 'Untitled',
          action: getLatestAction(post, scheduledMap[post.id], linkedinByBlog[post.id]?.color === 'green'),
          timestamp: post.lastModified || post.createdAt,
          status: getActivityStatus(post, scheduledMap[post.id])
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

  function getLatestAction(post: any, scheduledAt?: string, linkedinPublished?: boolean) {
    if (linkedinPublished) return 'Published to LinkedIn';
    if (post.status.published.completed) return 'Published to website';
    if (scheduledAt) return `Scheduled for ${scheduledAt}`;
    if (post.status.contentComplete.color !== 'red') return 'Content ready';
    return 'Post created';
  }

  function getActivityStatus(post: any, scheduledAt?: string): 'success' | 'warning' | 'error' | 'info' | 'scheduled' {
    if (post.status.published.completed) return 'success';
    if (scheduledAt) return 'scheduled';
    if (post.status.contentComplete.color !== 'red') return 'warning';
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
          title="LinkedIn"
          value={stats.linkedinPosts}
          icon={LinkedInIcon}
          variant="purple"
          className="animate-slide-up"
          style={{ animationDelay: "150ms" }}
        />
      </div>

      <div className="flex flex-wrap gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <Link href="/create">
          <Button size="lg" className="gap-2 gold-glow">
            <PlusCircle className="h-5 w-5" />
            Create new post
          </Button>
        </Link>
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
