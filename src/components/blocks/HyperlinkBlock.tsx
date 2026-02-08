"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";

interface HyperlinkBlockProps {
  data: {
    url?: { url?: string; cached_url?: string; linktype?: string };
    label?: string;
  };
  onChange: (data: any) => void;
}

export function HyperlinkBlock({ data, onChange }: HyperlinkBlockProps) {
  const urlValue = data.url?.url || data.url?.cached_url || "";
  const label = data.label || "";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">URL</Label>
        <div className="flex items-center gap-2">
          <Input
            value={urlValue}
            onChange={(e) =>
              onChange({
                ...data,
                url: {
                  ...data.url,
                  url: e.target.value,
                  linktype: "url",
                },
              })
            }
            placeholder="https://..."
            className="text-sm"
          />
          {urlValue && (
            <a
              href={urlValue}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Label</Label>
        <Input
          value={label}
          onChange={(e) => onChange({ ...data, label: e.target.value })}
          placeholder="Link text..."
          className="text-sm"
        />
      </div>
    </div>
  );
}
