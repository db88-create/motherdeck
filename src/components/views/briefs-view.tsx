"use client";

import { useFetch } from "@/lib/hooks";
import { Brief } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function BriefCard({ brief }: { brief: Brief }) {
  const [expanded, setExpanded] = useState(false);
  const f = brief.fields;

  const highlights = f.Highlights
    ? f.Highlights.split(",").map((t) => t.trim()).filter(Boolean)
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
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader
        className="cursor-pointer pb-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 mb-1">{formattedDate}</p>
            <CardTitle className="text-base text-white leading-tight">
              {f.Title || "Untitled Brief"}
            </CardTitle>
          </div>
          <div className="flex-shrink-0 mt-1">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
          </div>
        </div>
        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {highlights.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] border-zinc-700 text-zinc-400"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Executive Summary */}
          {f.Summary && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
                  Executive Summary
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {f.Summary}
              </p>
            </div>
          )}

          {/* Key Insights */}
          {f.KeyInsights && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                  Key Insights
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {f.KeyInsights}
              </p>
            </div>
          )}

          {/* Big Idea */}
          {f.BigIdea && (
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">
                  Big Idea
                </span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                {f.BigIdea}
              </p>
            </div>
          )}

          {/* Read Full Brief */}
          {f.FullContent && (
            <Dialog>
              <DialogTrigger className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                <BookOpen className="w-4 h-4" />
                Read Full Brief
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {f.Title}
                  </DialogTitle>
                  <p className="text-xs text-zinc-500">{formattedDate}</p>
                </DialogHeader>
                <ScrollArea className="max-h-[65vh] pr-4">
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                    {f.FullContent}
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
        <div className="animate-pulse text-zinc-500">Loading briefs...</div>
      </div>
    );
  }

  const briefsList = briefs || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-white">Brief Archive</h2>
          <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
            {briefsList.length}
          </Badge>
        </div>
      </div>

      {briefsList.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-12 text-zinc-500">
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
