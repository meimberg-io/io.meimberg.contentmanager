"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Type, Image, Youtube, Film, Minus, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichtextBlock } from "./RichtextBlock";
import { PictureBlock } from "./PictureBlock";
import { YoutubeBlock } from "./YoutubeBlock";
import { VideoBlock } from "./VideoBlock";
import { DividerBlock } from "./DividerBlock";
import { HyperlinkBlock } from "./HyperlinkBlock";

const BLOCK_META: Record<string, { label: string; icon: React.ReactNode }> = {
  richtext: { label: "Rich Text", icon: <Type className="h-3.5 w-3.5" /> },
  picture: { label: "Picture", icon: <Image className="h-3.5 w-3.5" /> },
  youtube: { label: "YouTube", icon: <Youtube className="h-3.5 w-3.5" /> },
  video: { label: "Video", icon: <Film className="h-3.5 w-3.5" /> },
  divider: { label: "Divider", icon: <Minus className="h-3.5 w-3.5" /> },
  hyperlink: { label: "Hyperlink", icon: <Link className="h-3.5 w-3.5" /> },
};

interface SortableBlockProps {
  id: string;
  block: any;
  onChange: (data: any) => void;
  onDelete: () => void;
}

export function SortableBlock({ id, block, onChange, onDelete }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const meta = BLOCK_META[block.component] || {
    label: block.component,
    icon: <Type className="h-3.5 w-3.5" />,
  };

  const renderEditor = () => {
    switch (block.component) {
      case "richtext":
        return <RichtextBlock data={block} onChange={onChange} />;
      case "picture":
        return <PictureBlock data={block} onChange={onChange} />;
      case "youtube":
        return <YoutubeBlock data={block} onChange={onChange} />;
      case "video":
        return <VideoBlock data={block} onChange={onChange} />;
      case "divider":
        return <DividerBlock />;
      case "hyperlink":
        return <HyperlinkBlock data={block} onChange={onChange} />;
      default:
        return (
          <div className="text-xs text-muted-foreground italic p-3 bg-secondary/20 rounded">
            Unsupported block type: <code>{block.component}</code>
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-border/50 bg-card transition-all",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      {/* Block header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-secondary/20 rounded-t-lg">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {meta.icon}
          <span className="font-medium">{meta.label}</span>
        </div>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Block content */}
      <div className="p-3">{renderEditor()}</div>
    </div>
  );
}
