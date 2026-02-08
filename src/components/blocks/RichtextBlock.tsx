"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichtextBlockProps {
  data: {
    content?: any; // Storyblok richtext document
  };
  onChange: (data: any) => void;
}

/**
 * Node type mapping: Storyblok snake_case -> TipTap camelCase
 */
const SB_TO_TIPTAP_TYPES: Record<string, string> = {
  bullet_list: "bulletList",
  ordered_list: "orderedList",
  list_item: "listItem",
  horizontal_rule: "horizontalRule",
  hard_break: "hardBreak",
  code_block: "codeBlock",
};

const TIPTAP_TO_SB_TYPES: Record<string, string> = {
  bulletList: "bullet_list",
  orderedList: "ordered_list",
  listItem: "list_item",
  horizontalRule: "horizontal_rule",
  hardBreak: "hard_break",
  codeBlock: "code_block",
};

/**
 * Recursively convert node types from Storyblok (snake_case) to TipTap (camelCase).
 */
function convertNodeTypes(node: any, typeMap: Record<string, string>): any {
  if (!node || typeof node !== "object") return node;
  const converted = { ...node };
  if (converted.type && typeMap[converted.type]) {
    converted.type = typeMap[converted.type];
  }
  if (Array.isArray(converted.content)) {
    converted.content = converted.content.map((child: any) =>
      convertNodeTypes(child, typeMap)
    );
  }
  return converted;
}

/**
 * Convert Storyblok richtext JSON to TipTap-compatible JSON.
 */
function storyblokToTiptap(doc: any): any {
  if (!doc || typeof doc !== "object") {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  return convertNodeTypes(doc, SB_TO_TIPTAP_TYPES);
}

/**
 * Convert TipTap JSON back to Storyblok richtext format.
 */
function tiptapToStoryblok(doc: any): any {
  return convertNodeTypes(doc, TIPTAP_TO_SB_TYPES);
}

export function RichtextBlock({ data, onChange }: RichtextBlockProps) {
  const initialContent = useRef(storyblokToTiptap(data.content));
  const suppressUpdate = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Image,
    ],
    content: initialContent.current,
    editorProps: {
      attributes: {
        class:
          "max-w-none min-h-[120px] focus:outline-none px-3 py-2",
      },
    },
    onUpdate: ({ editor }) => {
      if (suppressUpdate.current) return;
      const json = editor.getJSON();
      onChange({ ...data, content: tiptapToStoryblok(json) });
    },
  });

  // Sync external content changes (e.g. from AI generation)
  useEffect(() => {
    if (!editor || !data.content) return;
    const currentJSON = JSON.stringify(editor.getJSON());
    const incomingJSON = JSON.stringify(storyblokToTiptap(data.content));
    if (currentJSON !== incomingJSON) {
      suppressUpdate.current = true;
      editor.commands.setContent(storyblokToTiptap(data.content));
      suppressUpdate.current = false;
    }
  }, [data.content, editor]);

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap border-b border-border/50 bg-secondary/30 px-1 py-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-5 bg-border/50 mx-0.5" />
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-5 bg-border/50 mx-0.5" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Ordered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-5 bg-border/50 mx-0.5" />
        <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Link">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="flex-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded hover:bg-secondary transition-colors",
        active && "bg-secondary text-primary",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
