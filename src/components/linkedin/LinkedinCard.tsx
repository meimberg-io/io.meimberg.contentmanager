"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LinkedinPost } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, Circle, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlogParentInfo } from "@/components/linkedin/LinkedinEditor";

interface LinkedinCardProps {
  post: LinkedinPost;
  parent?: BlogParentInfo;
}

function StatusDotIcon({ color }: { color: string }) {
  const bgColor =
    color === "green" ? "bg-green-500/15" : color === "yellow" ? "bg-yellow-500/15" : color === "red" ? "bg-red-500/15" : "bg-gray-500/15";
  const iconColor =
    color === "green" ? "text-green-500" : color === "yellow" ? "text-yellow-500" : color === "red" ? "text-red-500" : "text-gray-400";
  const Icon = color === "green" ? CheckCircle : color === "yellow" ? AlertCircle : color === "red" ? XCircle : Circle;
  return (
    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", bgColor)}>
      <Icon className={cn("h-3.5 w-3.5", iconColor)} />
    </div>
  );
}

/** List card for a LinkedIn post (analogous to PostCard, list style). */
export function LinkedinCard({ post, parent }: LinkedinCardProps) {
  const router = useRouter();
  const preview = (post.linkedinText || "").trim();
  const firstLine = preview.split("\n").find((l) => l.trim()) || "(no text yet)";

  return (
    <div
      className="flex items-center gap-4 rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-primary/30 cursor-pointer"
      onClick={() => router.push(`/linkedin/${post.storyblokId}`)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium break-words">{firstLine}</p>
          {post.blogParentUuid ? (
            <Badge variant="outline" className="text-[10px] shrink-0 border-blue-500/40 text-blue-500">
              Attached
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] shrink-0">
              Standalone
            </Badge>
          )}
        </div>
        {preview && (
          <p className="text-sm text-muted-foreground break-words line-clamp-2 whitespace-pre-wrap mt-0.5">
            {preview}
          </p>
        )}
        {post.blogParentUuid && parent && (
          <Link
            href={`/posts/${parent.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400"
          >
            <Link2 className="h-3 w-3" />
            <span className="truncate max-w-[260px]">{parent.title}</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {post.lastModified ? new Date(post.lastModified).toLocaleDateString() : ""}
        </span>
        {/* contentComplete (active) + publishedLinkedIn (gray placeholder until MICM-12) */}
        <div className="flex items-center gap-1.5">
          <StatusDotIcon color={post.status.contentComplete.color} />
          <StatusDotIcon color="gray" />
        </div>
      </div>
    </div>
  );
}
