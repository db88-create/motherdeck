"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useFetch } from "@/lib/hooks";
import type { DailyNote } from "@/lib/services/daily-notes";
import {
  FileText,
  Check,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function NotesPanel() {
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [initialized, setInitialized] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = useFetch<DailyNote>("/api/daily-notes");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {},
        orderedList: {},
        horizontalRule: {},
      }),
      Placeholder.configure({
        placeholder:
          "Start typing... meeting notes, thoughts, anything. This note persists.",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] text-[var(--md-text-body)] [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-[var(--md-text-primary)] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--md-text-primary)] [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[var(--md-text-primary)] [&_p]:text-sm [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-sm [&_li]:leading-relaxed [&_hr]:border-[var(--md-border)] [&_strong]:font-semibold [&_em]:italic [&_.is-editor-empty:first-child::before]:text-[var(--md-text-tertiary)] [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:pointer-events-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (!initialized) return;
      const html = editor.getHTML();
      debouncedSave(html);
    },
  });

  // Load content once data arrives
  useEffect(() => {
    if (data && editor && !initialized) {
      setNoteId(data.id);
      const content = data.content || "";
      // If content looks like plain text (no HTML tags), wrap in paragraphs
      if (content && !content.includes("<")) {
        const html = content
          .split("\n")
          .map((line: string) => (line.trim() ? `<p>${line}</p>` : "<p></p>"))
          .join("");
        editor.commands.setContent(html);
      } else {
        editor.commands.setContent(content);
      }
      setInitialized(true);
    }
  }, [data, editor, initialized]);

  const save = useCallback(
    async (html: string) => {
      if (!noteId) return;
      setSaveState("saving");
      try {
        await fetch("/api/daily-notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: noteId, content: html }),
        });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("idle");
      }
    },
    [noteId]
  );

  const debouncedSave = useCallback(
    (html: string) => {
      setSaveState("idle");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => save(html), 1000);
    },
    [save]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        active
          ? "bg-violet-500/15 text-violet-500"
          : "text-[var(--md-text-tertiary)] hover:text-[var(--md-text-body)] hover:bg-[var(--md-surface)]"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-[var(--md-text-tertiary)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--md-text-secondary)]">
          Notes
        </h3>
        <span className="text-xs text-[var(--md-text-tertiary)] ml-1">Persistent</span>
        <div className="ml-auto">
          {saveState === "saving" && (
            <span className="text-xs text-[var(--md-text-tertiary)]">Saving...</span>
          )}
          {saveState === "saved" && (
            <span className="text-xs text-[var(--md-success)] flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 mb-2 pb-2 border-b border-[var(--md-border-light)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-[var(--md-border-light)] mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-[var(--md-border-light)] mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
