#!/usr/bin/env node

/**
 * Migrate HTML briefs from tools/ to Airtable Briefs table
 * Run with: npx ts-node migrate-briefs.ts
 */

import fs from "fs";
import path from "path";
import { createBrief } from "./src/lib/airtable-write";

const briefsDir = path.join(
  process.env.HOME || "/home/claudeclaw",
  ".openclaw/workspace/tools"
);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractBriefData(filename: string) {
  const match = filename.match(/2026-(\d{2})-(\d{2})/);
  if (!match) return null;

  const month = match[1];
  const day = match[2];
  const date = `2026-${month}-${day}`;

  return {
    date,
    filename,
  };
}

function parseHtmlBrief(html: string) {
  // Extract sections from HTML
  const sections = {
    executive: "",
    insights: "",
    bigIdea: "",
    full: "",
    highlights: [] as string[],
  };

  // Look for section headers and extract content
  const execMatch = html.match(/📊.*?Executive Summary.*?<\/h2>(.*?)(?=<h2|$)/s);
  if (execMatch) {
    sections.executive = execMatch[1]
      .replace(/<[^>]*>/g, "")
      .trim()
      .substring(0, 300);
  }

  const insightMatch = html.match(/📈.*?Key Insights.*?<\/h2>(.*?)(?=<h2|$)/s);
  if (insightMatch) {
    sections.insights = insightMatch[1]
      .replace(/<[^>]*>/g, "")
      .trim()
      .substring(0, 400);
  }

  const ideaMatch = html.match(/💡.*?Strategic Insights.*?<\/h2>(.*?)(?=<h2|$)/s);
  if (ideaMatch) {
    sections.bigIdea = ideaMatch[1]
      .replace(/<[^>]*>/g, "")
      .trim()
      .substring(0, 200);
  }

  // Full text: everything without HTML tags
  sections.full = html.replace(/<[^>]*>/g, "").trim();

  // Extract highlights from any bold text or keywords
  const keywordMatch = html.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  sections.highlights = Array.from(new Set(keywordMatch.slice(0, 5)));

  return sections;
}

async function migrateBriefs() {
  console.log("🚀 Migrating briefs to Airtable...\n");

  try {
    const files = fs
      .readdirSync(briefsDir)
      .filter((f) => f.match(/primesight_brief_\d{4}-\d{2}-\d{2}\.html/));

    console.log(`Found ${files.length} briefs to migrate\n`);

    let migrated = 0;
    for (const file of files) {
      const briefData = extractBriefData(file);
      if (!briefData) continue;

      const filePath = path.join(briefsDir, file);
      const html = fs.readFileSync(filePath, "utf-8");
      const parsed = parseHtmlBrief(html);

      const result = await createBrief({
        date: briefData.date,
        title: `DOOH & Programmatic Brief - ${new Date(briefData.date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        })}`,
        executiveSummary:
          parsed.executive ||
          "Daily briefing on DOOH and programmatic advertising developments.",
        keyInsights:
          parsed.insights || "Key market insights and industry developments.",
        bigIdea: parsed.bigIdea || "Strategic opportunity for PrimeSight.",
        fullBrief: parsed.full,
        highlights: parsed.highlights,
      });

      if (result.success) {
        migrated++;
        console.log(`✓ ${briefData.date} (${file})`);
      } else {
        console.log(`✗ ${briefData.date}: ${result.error}`);
      }

      await sleep(200);
    }

    console.log(`\n✅ Migrated ${migrated}/${files.length} briefs`);
  } catch (err: any) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

migrateBriefs();
