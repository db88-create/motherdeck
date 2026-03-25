"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/hooks/useTheme";
import {
  CalendarDays,
  CalendarRange,
  Calendar,
  BarChart3,
  Lightbulb,
  Newspaper,
  Rocket,
  ClipboardCheck,
  StickyNote,
  Sun,
  Moon,
} from "lucide-react";
import { InstallPrompt } from "./install-prompt";

const tabs = [
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "week", label: "Week", icon: CalendarRange },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "mission", label: "Mission Control", icon: Rocket },
{ id: "action-notes", label: "Action Notes", icon: StickyNote },
  { id: "ideas", label: "Ideas & Expenses", icon: Lightbulb },
  { id: "briefs", label: "Briefs & Activity", icon: Newspaper },
  { id: "usage", label: "Usage & Costs", icon: BarChart3 },
  { id: "review", label: "Review", icon: ClipboardCheck },
] as const;

export type TabId = (typeof tabs)[number]["id"];

export function Nav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 bg-[var(--md-bg-alt)] border-r border-[var(--md-border)] p-4 gap-1 shrink-0">
        <div className="flex items-center gap-3 mb-8 px-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="font-semibold text-[var(--md-text-primary)] tracking-tight">
            Command
          </span>
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out min-h-[44px]",
              active === tab.id
                ? "bg-[var(--md-highlight)] text-violet-700 font-medium"
                : "text-[var(--md-text-secondary)] hover:bg-[var(--md-surface)] hover:text-[var(--md-text-body)]"
            )}
          >
            <tab.icon className="w-[18px] h-[18px]" />
            {tab.label}
          </button>
        ))}

        {/* Install prompt + Theme toggle */}
        <div className="mt-auto pt-4 flex flex-col gap-2">
          <InstallPrompt />
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out min-h-[44px] w-full text-[var(--md-text-secondary)] hover:bg-[var(--md-surface)] hover:text-[var(--md-text-body)]"
          >
            {theme === "light" ? (
              <Moon className="w-[18px] h-[18px]" />
            ) : (
              <Sun className="w-[18px] h-[18px]" />
            )}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--md-bg)] border-t border-[var(--md-border)] z-50">
        <div className="flex items-center justify-around py-2 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out min-w-[44px] min-h-[44px]",
                active === tab.id
                  ? "text-violet-600"
                  : "text-[var(--md-text-tertiary)]"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="truncate max-w-[60px]">
                {tab.id === "ideas"
                  ? "Ideas"
                  : tab.id === "briefs"
                  ? "Briefs"
                  : tab.label}
              </span>
            </button>
          ))}
          {/* Mobile theme toggle */}
          <button
            onClick={toggle}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out min-w-[44px] min-h-[44px]",
              "text-[var(--md-text-tertiary)]"
            )}
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
            <span className="truncate max-w-[60px]">Theme</span>
          </button>
        </div>
      </div>
    </>
  );
}
