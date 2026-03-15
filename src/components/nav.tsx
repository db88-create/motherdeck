"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Lightbulb,
  Newspaper,
} from "lucide-react";
import { useState } from "react";

const tabs = [
  { id: "command", label: "Command Center", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "usage", label: "Usage & Costs", icon: BarChart3 },
  { id: "ideas", label: "Ideas & Expenses", icon: Lightbulb },
  { id: "briefs", label: "Briefs & Activity", icon: Newspaper },
] as const;

export type TabId = (typeof tabs)[number]["id"];

export function Nav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 bg-gray-50 border-r border-gray-200 p-4 gap-1 shrink-0">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">
            MotherDeck
          </span>
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active === tab.id
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-900 hover:bg-white"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onChange(tab.id);
                setMobileOpen(false);
              }}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors min-w-0",
                active === tab.id
                  ? "text-violet-600"
                  : "text-gray-400"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="truncate max-w-[60px]">
                {tab.id === "command"
                  ? "Home"
                  : tab.id === "ideas"
                  ? "Ideas"
                  : tab.id === "briefs"
                  ? "Briefs"
                  : tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
