"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BlogPost } from "@/types";
import { StatusRow } from "@/components/ui/StatusIcon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: BlogPost;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  viewMode?: "grid" | "list";
  hideActions?: boolean;
  selectionMode?: boolean;
}

export function PostCard({ post, isSelected, onSelect, viewMode = "grid", hideActions = false, selectionMode = false }: PostCardProps) {
  const router = useRouter();

  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "flex items-center gap-4 rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-primary/30",
          isSelected && "ring-2 ring-primary",
          onSelect && "cursor-pointer"
        )}
        onClick={() => {
          if (selectionMode && onSelect) {
            onSelect(post.id, !isSelected);
          } else {
            router.push(`/posts/${post.slug}`);
          }
        }}
      >
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(post.id, !!checked)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        {post.teaserimage && (
          <img
            src={post.teaserimage}
            alt={post.teasertitle || post.pagetitle}
            className="h-12 w-12 rounded-lg object-cover"
          />
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium break-words">{post.pagetitle || post.slug}</p>
          <p className="text-sm text-muted-foreground break-words whitespace-normal">{post.abstract}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {post.date || 'No date'}
          </span>
          <StatusRow status={post.status} />
        </div>

        {!hideActions && (
          <div className="flex items-center gap-1">
            <Link href={`/posts/${post.slug}`} onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={cn(
        "group overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg",
        isSelected && "ring-2 ring-primary",
        onSelect && "cursor-pointer"
      )}
      onClick={() => {
        if (selectionMode && onSelect) {
          onSelect(post.id, !isSelected);
        } else {
          router.push(`/posts/${post.slug}`);
        }
      }}
    >
      {onSelect && (
        <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(post.id, !!checked)}
          />
        </div>
      )}

      {/* Teaser image */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {post.teaserimage ? (
          <img
            src={post.teaserimage}
            alt={post.teasertitle || post.pagetitle}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium truncate">{post.pagetitle || post.slug}</h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.abstract}</p>

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">{post.date || 'No date'}</span>
          <StatusRow status={post.status} />
        </div>
      </div>
    </div>
  );
}
