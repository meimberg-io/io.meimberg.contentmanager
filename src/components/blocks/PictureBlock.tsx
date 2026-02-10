"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2, ImageIcon } from "lucide-react";

interface PictureBlockProps {
  data: {
    image?: { filename?: string; id?: number; alt?: string };
    style?: "" | "normal" | "keyvisual" | "small";
    spacing?: "" | "default" | "large";
  };
  onChange: (data: any) => void;
}

export function PictureBlock({ data, onChange }: PictureBlockProps) {
  const [uploading, setUploading] = useState(false);
  const imageUrl = data.image?.filename || "";
  const style = data.style || "normal";
  const spacing = data.spacing || "default";

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
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
          image: {
            ...data.image,
            filename: result.filename || result.publicUrl,
            id: result.id,
          },
        });
      } catch (error) {
        console.error("Image upload failed:", error);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-3">
      {imageUrl ? (
        <div className="space-y-2">
          <div className="relative group">
            <img
              src={imageUrl}
              alt={data.image?.alt || ""}
              className="w-full rounded-lg object-cover max-h-80"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5"
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
            <ImageIcon className="h-8 w-8" />
          )}
          <span className="text-sm">
            {uploading ? "Uploading..." : "Click to upload image"}
          </span>
        </button>
      )}

      {/* Options row */}
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Style</Label>
          <Select
            value={style}
            onValueChange={(v) =>
              onChange({ ...data, style: v })
            }
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="keyvisual">Key Visual</SelectItem>
              <SelectItem value="small">Small</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Spacing</Label>
          <Select
            value={spacing}
            onValueChange={(v) =>
              onChange({ ...data, spacing: v })
            }
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
