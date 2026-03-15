"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Lightbulb,
  Newspaper,
} from "lucide-react";

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
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 bg-[#fafafa] border-r border-[#e5e5e5] p-4 gap-1 shrink-0">
        <div className="flex items-center gap-3 mb-8 px-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="font-semibold text-[#0a0a0a] tracking-tight">
            MotherDeck
          </span>
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out min-h-[44px]",
              active === tab.id
                ? "bg-[#f5f3ff] text-violet-700 font-medium"
                : "text-[#737373] hover:bg-[#f5f5f5] hover:text-[#404040]"
            )}
          >
            <tab.icon className="w-[18px] h-[18px]" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e5e5] z-50">
        <div className="flex items-center justify-around py-2 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out min-w-[44px] min-h-[44px]",
                active === tab.id
                  ? "text-violet-600"
                  : "text-[#a3a3a3]"
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
