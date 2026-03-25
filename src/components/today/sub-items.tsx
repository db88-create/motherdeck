"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, Square, CheckSquare2, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubItem {
  text: string;
  done: boolean;
}

interface SubItemsProps {
  items: SubItem[];
  onChange: (items: SubItem[]) => void;
  collapsed?: boolean;
}

export function SubItemsList({ items, onChange, collapsed: initialCollapsed }: SubItemsProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed ?? items.length === 0);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) addInputRef.current?.focus();
  }, [adding]);

  const handleToggle = (idx: number) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, done: !item.done } : item
    );
    onChange(updated);
  };

  const handleRemove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) {
      setAdding(false);
      return;
    }
    onChange([...items, { text, done: false }]);
    setNewText("");
    addInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Escape") {
      setAdding(false);
      setNewText("");
    }
  };

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="ml-6 group/subs">
      {/* Toggle + summary */}
      {items.length > 0 && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 text-xs text-[var(--md-text-tertiary)] hover:text-[var(--md-text-secondary)] transition-colors mb-0.5"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          <span>
            {doneCount}/{items.length} sub-items
          </span>
        </button>
      )}

      {/* Items */}
      {!collapsed && (
        <div className="space-y-0.5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="group/sub flex items-center gap-1.5 py-0.5 pl-1"
            >
              <button
                onClick={() => handleToggle(idx)}
                className="shrink-0"
              >
                {item.done ? (
                  <CheckSquare2 className="w-3.5 h-3.5 text-[var(--md-success)]" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-[var(--md-text-tertiary)] hover:text-violet-500" />
                )}
              </button>
              <span
                className={cn(
                  "flex-1 text-xs leading-relaxed",
                  item.done
                    ? "line-through text-[var(--md-text-tertiary)]"
                    : "text-[var(--md-text-body)]"
                )}
              >
                {item.text}
              </span>
              <button
                onClick={() => handleRemove(idx)}
                className="opacity-0 group-hover/sub:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] transition-all shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add sub-item — only shows inline input, button is hidden until hover */}
          {adding ? (
            <div className="flex items-center gap-1.5 py-0.5 pl-1">
              <Square className="w-3.5 h-3.5 text-[var(--md-text-disabled)] shrink-0" />
              <input
                ref={addInputRef}
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (newText.trim()) handleAdd();
                  else setAdding(false);
                }}
                placeholder="Add sub-item..."
                className="flex-1 text-xs bg-transparent text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none"
                autoComplete="off"
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setAdding(true);
                setNewText("");
                setCollapsed(false);
              }}
              className="opacity-0 group-hover/subs:opacity-100 flex items-center gap-1 py-0.5 pl-1 text-xs text-[var(--md-text-tertiary)] hover:text-violet-500 transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>+</span>
            </button>
          )}
        </div>
      )}

      {/* No "add sub-item" button when collapsed — sub-items are accessed by expanding */}
    </div>
  );
}

// JSON helpers
export function parseSubItems(json: string | undefined | null): SubItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function serializeSubItems(items: SubItem[]): string {
  return JSON.stringify(items);
}
