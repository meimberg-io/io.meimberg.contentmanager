"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SortableBlock } from "./SortableBlock";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Type, Image, Youtube, Film, Minus, Link } from "lucide-react";

interface BodyEditorProps {
  blocks: any[];
  onChange: (blocks: any[]) => void;
}

function generateUid(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 36);
}

const BLOCK_TEMPLATES: Record<string, () => any> = {
  richtext: () => ({
    _uid: generateUid(),
    component: "richtext",
    content: { type: "doc", content: [{ type: "paragraph" }] },
  }),
  picture: () => ({
    _uid: generateUid(),
    component: "picture",
    image: {},
    style: "normal",
    spacing: "default",
  }),
  youtube: () => ({
    _uid: generateUid(),
    component: "youtube",
    youtubeid: "",
    format: "",
  }),
  video: () => ({
    _uid: generateUid(),
    component: "video",
    file: {},
  }),
  divider: () => ({
    _uid: generateUid(),
    component: "divider",
  }),
  hyperlink: () => ({
    _uid: generateUid(),
    component: "hyperlink",
    url: { url: "", linktype: "url" },
    label: "",
  }),
};

const ADD_BLOCK_OPTIONS = [
  { key: "richtext", label: "Rich Text", icon: <Type className="h-4 w-4" /> },
  { key: "picture", label: "Picture", icon: <Image className="h-4 w-4" /> },
  { key: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" /> },
  { key: "video", label: "Video", icon: <Film className="h-4 w-4" /> },
  { key: "divider", label: "Divider", icon: <Minus className="h-4 w-4" /> },
  { key: "hyperlink", label: "Hyperlink", icon: <Link className="h-4 w-4" /> },
];

export function BodyEditor({ blocks, onChange }: BodyEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const blockIds = blocks.map((b) => b._uid);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = blocks.findIndex((b) => b._uid === active.id);
      const newIndex = blocks.findIndex((b) => b._uid === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      onChange(arrayMove(blocks, oldIndex, newIndex));
    },
    [blocks, onChange]
  );

  const handleBlockChange = useCallback(
    (index: number, data: any) => {
      const updated = [...blocks];
      updated[index] = { ...updated[index], ...data };
      onChange(updated);
    },
    [blocks, onChange]
  );

  const handleBlockDelete = useCallback(
    (index: number) => {
      onChange(blocks.filter((_, i) => i !== index));
    },
    [blocks, onChange]
  );

  const handleAddBlock = useCallback(
    (type: string) => {
      const template = BLOCK_TEMPLATES[type];
      if (!template) return;
      onChange([...blocks, template()]);
    },
    [blocks, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {blocks.length} block{blocks.length !== 1 ? "s" : ""}
      </div>

      {blocks.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blockIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {blocks.map((block, index) => (
                <SortableBlock
                  key={block._uid}
                  id={block._uid}
                  block={block}
                  onChange={(data) => handleBlockChange(index, data)}
                  onDelete={() => handleBlockDelete(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-border/30 p-8 text-center text-muted-foreground">
          <p className="text-sm">No body content yet.</p>
          <p className="text-xs mt-1">
            Add blocks below to build the post body.
          </p>
        </div>
      )}

      {/* Add Block */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add Block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          {ADD_BLOCK_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.key}
              onClick={() => handleAddBlock(opt.key)}
              className="gap-2"
            >
              {opt.icon}
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
