"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // ISO string or ""
  onChange: (iso: string) => void;
  onClose: () => void;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DEFAULT_HOUR = 18; // 6 PM

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export function DatePicker({ value, onChange, onClose }: DatePickerProps) {
  const existing = value ? new Date(value) : null;
  const now = new Date();

  const [viewYear, setViewYear] = useState(existing?.getFullYear() ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(existing?.getMonth() ?? now.getMonth());
  const [selectedHour, setSelectedHour] = useState(existing ? existing.getHours() : DEFAULT_HOUR);
  const [selectedMinute, setSelectedMinute] = useState(existing ? existing.getMinutes() : 0);
  const [showTime, setShowTime] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const selectedDate = existing
    ? `${existing.getFullYear()}-${existing.getMonth()}-${existing.getDate()}`
    : null;

  const weeks = getMonthGrid(viewYear, viewMonth);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handleDayClick = (day: number) => {
    const d = new Date(viewYear, viewMonth, day, selectedHour, selectedMinute);
    onChange(d.toISOString());
  };

  const handleTimeChange = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    // If a date is already selected, update it with new time
    if (existing) {
      const d = new Date(viewYear, viewMonth, existing.getDate(), hour, minute);
      onChange(d.toISOString());
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Quick date shortcuts
  const setToday = () => {
    const d = new Date();
    d.setHours(selectedHour, selectedMinute, 0, 0);
    onChange(d.toISOString());
  };

  const setTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(selectedHour, selectedMinute, 0, 0);
    onChange(d.toISOString());
  };

  const setNextWeek = () => {
    const d = new Date();
    // Next Monday
    const daysUntilMonday = ((8 - d.getDay()) % 7) || 7;
    d.setDate(d.getDate() + daysUntilMonday);
    d.setHours(selectedHour, selectedMinute, 0, 0);
    onChange(d.toISOString());
  };

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const timePresets = [
    { label: "9 AM", h: 9, m: 0 },
    { label: "12 PM", h: 12, m: 0 },
    { label: "3 PM", h: 15, m: 0 },
    { label: "6 PM", h: 18, m: 0 },
    { label: "9 PM", h: 21, m: 0 },
  ];

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 bg-[var(--card)] border border-[var(--md-border)] rounded-xl shadow-xl p-3 w-[260px]"
      style={{ left: 0 }}
    >
      {/* Quick shortcuts */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={setToday}
          className="flex-1 text-xs px-2 py-1.5 rounded-md bg-[var(--md-surface)] text-[var(--md-text-secondary)] hover:text-violet-500 hover:bg-violet-500/10 transition-colors"
        >
          Today
        </button>
        <button
          onClick={setTomorrow}
          className="flex-1 text-xs px-2 py-1.5 rounded-md bg-[var(--md-surface)] text-[var(--md-text-secondary)] hover:text-violet-500 hover:bg-violet-500/10 transition-colors"
        >
          Tomorrow
        </button>
        <button
          onClick={setNextWeek}
          className="flex-1 text-xs px-2 py-1.5 rounded-md bg-[var(--md-surface)] text-[var(--md-text-secondary)] hover:text-violet-500 hover:bg-violet-500/10 transition-colors"
        >
          Next Mon
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1 rounded-md text-[var(--md-text-tertiary)] hover:text-[var(--md-text-body)] hover:bg-[var(--md-surface)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-[var(--md-text-primary)]">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded-md text-[var(--md-text-tertiary)] hover:text-[var(--md-text-body)] hover:bg-[var(--md-surface)] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-[var(--md-text-tertiary)] py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              if (day === null) {
                return <div key={di} className="w-full aspect-square" />;
              }

              const dayKey = `${viewYear}-${viewMonth}-${day}`;
              const isToday = dayKey === todayKey;
              const isSelected = dayKey === selectedDate;
              const isPast = new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <button
                  key={di}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "w-full aspect-square flex items-center justify-center text-xs rounded-md transition-all",
                    isSelected
                      ? "bg-violet-600 text-white font-semibold"
                      : isToday
                        ? "bg-violet-500/10 text-violet-500 font-semibold"
                        : isPast
                          ? "text-[var(--md-text-disabled)] hover:bg-[var(--md-surface)]"
                          : "text-[var(--md-text-body)] hover:bg-[var(--md-surface)]"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Time section */}
      <div className="mt-2 pt-2 border-t border-[var(--md-border)]">
        <button
          onClick={() => setShowTime(!showTime)}
          className="flex items-center gap-1.5 text-xs text-[var(--md-text-secondary)] hover:text-violet-500 transition-colors w-full"
        >
          <Clock className="w-3 h-3" />
          <span>{formatTime(selectedHour, selectedMinute)}</span>
        </button>

        {showTime && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {timePresets.map(({ label, h, m }) => (
              <button
                key={label}
                onClick={() => handleTimeChange(h, m)}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  selectedHour === h && selectedMinute === m
                    ? "bg-violet-600 text-white"
                    : "bg-[var(--md-surface)] text-[var(--md-text-secondary)] hover:text-violet-500 hover:bg-violet-500/10"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
