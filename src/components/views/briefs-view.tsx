"use client";

import { useFetch } from "@/lib/hooks";
import { Brief, Skill } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const SKILL_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  archived: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  broken: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function BriefsView() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Briefs & Activity</h1>
      <Tabs defaultValue="briefs">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="briefs" className="data-[state=active]:bg-zinc-700">
            <Newspaper className="w-4 h-4 mr-1.5" /> Morning Briefs
          </TabsTrigger>
          <TabsTrigger value="skills" className="data-[state=active]:bg-zinc-700">
            <Wrench className="w-4 h-4 mr-1.5" /> Skills
          </TabsTrigger>
        </TabsList>
        <TabsContent value="briefs">
          <BriefsTab />
        </TabsContent>
        <TabsContent value="skills">
          <SkillsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BriefsTab() {
  const { data: briefs, loading } = useFetch<Brief[]>("/api/briefs");
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!briefs || briefs.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 mt-4">
        <Newspaper className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
        <p>No morning briefs yet</p>
        <p className="text-xs text-zinc-600 mt-1">
          Briefs sync from the primesight-morning-brief cron
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {briefs.map((brief) => (
        <Card
          key={brief.id}
          className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          <CardContent className="p-4">
            <button
              onClick={() =>
                setExpanded(expanded === brief.id ? null : brief.id)
              }
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    >
                      {brief.fields.Date}
                    </Badge>
                    {brief.fields.TopicsCount > 0 && (
                      <span className="text-xs text-zinc-500">
                        {brief.fields.TopicsCount} topics
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white">
                    {brief.fields.Title || "Morning Brief"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                    {brief.fields.Summary}
                  </p>
                </div>
                {expanded === brief.id ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
              </div>
            </button>
            {expanded === brief.id && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <ScrollArea className="max-h-96">
                  <div
                    className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: brief.fields.FullContent || brief.fields.Summary,
                    }}
                  />
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SkillsTab() {
  const { data: skills, loading } = useFetch<Skill[]>("/api/skills");

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!skills || skills.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 mt-4">
        <Wrench className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
        <p>No skills synced yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
      {skills.map((skill) => (
        <Card
          key={skill.id}
          className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-white">
                {skill.fields.Name}
              </p>
              <Badge
                variant="outline"
                className={
                  SKILL_STATUS_COLORS[skill.fields.Status] || ""
                }
              >
                {skill.fields.Status}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 line-clamp-2">
              {skill.fields.Description}
            </p>
            {skill.fields.Category && (
              <Badge
                variant="outline"
                className="mt-2 text-xs bg-zinc-800/50 text-zinc-400 border-zinc-700"
              >
                {skill.fields.Category}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
