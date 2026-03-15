"use client";

import { useFetch } from "@/lib/hooks";
import { Brief } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Newspaper,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

function cleanBriefContent(raw: string): string {
  if (!raw) return "";
  const lines = raw.split("\n");
  let contentStart = 0;
  let braceDepth = 0;
  let inCss = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      !inCss &&
      i < 5 &&
      (line === "* {" || line.startsWith("* {") || line.startsWith("body {"))
    ) {
      inCss = true;
    }
    if (inCss) {
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      if (braceDepth <= 0 && i > 2) {
        const nextLine = lines
          .slice(i + 1)
          .find((l) => l.trim().length > 0);
        if (
          nextLine &&
          /^[.#@a-z]/i.test(nextLine.trim()) &&
          nextLine.includes("{")
        ) {
          continue;
        }
        contentStart = i + 1;
        inCss = false;
      }
      continue;
    }
  }

  let cleaned = lines.slice(contentStart).join("\n");
  cleaned = cleaned.replace(/^\s*\n+/, "");
  cleaned = cleaned
    .split("\n")
    .map((l) => l.replace(/^\s{4,}/, "  "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

function BriefCard({ brief }: { brief: Brief }) {
  const [expanded, setExpanded] = useState(false);
  const f = brief.fields;

  const highlights = f.Highlights
    ? f.Highlights.split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const formattedDate = f.Date
    ? new Date(f.Date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Card className="hover:border-[var(--md-border)] transition-all">
      <CardHeader
        className="cursor-pointer pb-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--md-text-tertiary)] mb-1">{formattedDate}</p>
            <CardTitle className="text-base text-[var(--md-text-primary)] leading-tight">
              {f.Title || "Untitled Brief"}
            </CardTitle>
          </div>
          <div className="flex-shrink-0 mt-1">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-[var(--md-text-tertiary)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--md-text-tertiary)]" />
            )}
          </div>
        </div>
        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {highlights.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] border-[var(--md-border)] text-[var(--md-text-secondary)]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {f.Summary && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium text-blue-500 uppercase tracking-wider">
                  Executive Summary
                </span>
              </div>
              <p className="text-sm text-[var(--md-text-body)] leading-relaxed whitespace-pre-line">
                {f.Summary}
              </p>
            </div>
          )}

          {f.KeyInsights && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">
                  Key Insights
                </span>
              </div>
              <p className="text-sm text-[var(--md-text-body)] leading-relaxed whitespace-pre-line">
                {f.KeyInsights}
              </p>
            </div>
          )}

          {f.BigIdea && (
            <div className="bg-[var(--md-highlight)] border border-violet-100 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-xs font-medium text-violet-500 uppercase tracking-wider">
                  Big Idea
                </span>
              </div>
              <p className="text-sm text-[var(--md-text-body)] leading-relaxed whitespace-pre-line">
                {f.BigIdea}
              </p>
            </div>
          )}

          {f.FullContent && (
            <Dialog>
              <DialogTrigger className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 transition-colors">
                <BookOpen className="w-4 h-4" />
                Read Full Brief
              </DialogTrigger>
              <DialogContent className="bg-[var(--md-bg)] border-[var(--md-border)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.12)] max-w-2xl max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle className="text-[var(--md-text-primary)]">
                    {f.Title}
                  </DialogTitle>
                  <p className="text-xs text-[var(--md-text-tertiary)]">{formattedDate}</p>
                </DialogHeader>
                <ScrollArea className="max-h-[65vh] pr-4">
                  <div className="text-sm text-[var(--md-text-body)] leading-relaxed whitespace-pre-line">
                    {cleanBriefContent(f.FullContent)}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function BriefsView() {
  const { data: briefs, loading } = useFetch<Brief[]>("/api/briefs");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--md-text-tertiary)]">Loading briefs...</div>
      </div>
    );
  }

  const briefsList = briefs || [];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-semibold text-[var(--md-text-primary)]">Brief Archive</h2>
          <Badge
            variant="outline"
            className="border-[var(--md-border)] text-[var(--md-text-secondary)] text-xs"
          >
            {briefsList.length}
          </Badge>
        </div>
      </div>

      {briefsList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-[var(--md-text-tertiary)]">
            <Newspaper className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No briefs yet</p>
            <p className="text-xs mt-1">
              Morning briefs will appear here once generated
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {briefsList.map((brief) => (
            <BriefCard key={brief.id} brief={brief} />
          ))}
        </div>
      )}
    </div>
  );
}
