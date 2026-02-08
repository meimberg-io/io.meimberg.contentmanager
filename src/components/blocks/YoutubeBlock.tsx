"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface YoutubeBlockProps {
  data: {
    youtubeid?: string;
    format?: "" | "cinema" | "square";
  };
  onChange: (data: any) => void;
}

export function YoutubeBlock({ data, onChange }: YoutubeBlockProps) {
  const youtubeId = data.youtubeid || "";
  const format = data.format || "";

  // Extract ID from full YouTube URL if pasted
  const extractYoutubeId = (input: string): string => {
    const match = input.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : input.trim();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            YouTube ID or URL
          </Label>
          <Input
            value={youtubeId}
            onChange={(e) =>
              onChange({
                ...data,
                youtubeid: extractYoutubeId(e.target.value),
              })
            }
            placeholder="dQw4w9WgXcQ or full URL..."
            className="text-sm"
          />
        </div>
        <div className="w-32 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Format</Label>
          <Select
            value={format || "default"}
            onValueChange={(v) =>
              onChange({ ...data, format: v === "default" ? "" : v })
            }
          >
            <SelectTrigger className="text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="cinema">Cinema</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview */}
      {youtubeId && (
        <div
          className={`relative overflow-hidden rounded-lg bg-black ${
            format === "square" ? "aspect-square" : "aspect-video"
          }`}
        >
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
