"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Film } from "lucide-react";

interface VideoBlockProps {
  data: {
    file?: { filename?: string; id?: number };
  };
  onChange: (data: any) => void;
}

export function VideoBlock({ data, onChange }: VideoBlockProps) {
  const [uploading, setUploading] = useState(false);
  const fileUrl = data.file?.filename || "";

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/posts/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");
        const result = await response.json();

        onChange({
          ...data,
          file: {
            filename: result.filename || result.publicUrl,
            id: result.id,
          },
        });
      } catch (error) {
        console.error("Video upload failed:", error);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-3">
      {fileUrl ? (
        <div className="space-y-2">
          <video
            src={fileUrl}
            controls
            className="w-full rounded-lg bg-black max-h-80"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate max-w-[300px]">
              {fileUrl.split("/").pop()}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Replace
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/50 p-8 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Film className="h-8 w-8" />
          )}
          <span className="text-sm">
            {uploading ? "Uploading..." : "Click to upload video"}
          </span>
        </button>
      )}
    </div>
  );
}
