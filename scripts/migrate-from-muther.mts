#!/usr/bin/env node

/**
 * Migration Script: muther.db → Airtable
 * 
 * This script pulls all todos, ideas, and expenses from muther.db
 * and pushes them to Airtable using the write helpers.
 * 
 * Run with: npx ts-node migrate-from-muther.ts
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import {
  createTask,
  updateTask,
  createIdea,
  createExpense,
} from "./src/lib/airtable-write";

// Load .env.local
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

const dbPath = path.join(
  process.env.HOME || "/home/claudeclaw",
  ".openclaw/workspace/muther.db"
);

interface Todo {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  status: string;
}

interface Idea {
  id: string;
  title: string;
  priority: string;
  related_project: string | null;
  status: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  date: string | null;
  vendor: string | null;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function migrateTodos(db: Database.Database) {
  console.log("\n📝 Migrating todos...");
  const todos = db
    .prepare("SELECT id, title, priority, due_date, status FROM todos")
    .all() as Todo[];

  let created = 0;
  for (const todo of todos) {
    try {
      const result = await createTask({
        name: todo.title,
        priority: todo.priority || "medium",
        status: todo.status === "done" ? "done" : "todo",
        dueDate: todo.due_date || undefined,
        tags: ["migrated"],
      });
      if (result.success) {
        created++;
        console.log(`  ✓ "${todo.title}"`);
      } else {
        console.error(`  ✗ "${todo.title}": ${result.error}`);
      }
      await sleep(100); // Rate limit
    } catch (err: any) {
      console.error(`  ✗ "${todo.title}": ${err.message}`);
    }
  }

  console.log(`  → Created ${created}/${todos.length} tasks`);
  return created;
}

async function migrateIdeas(db: Database.Database) {
  console.log("\n💡 Migrating ideas...");
  const ideas = db
    .prepare("SELECT id, title, priority, related_project, status FROM ideas")
    .all() as Idea[];

  let created = 0;
  for (const idea of ideas) {
    try {
      const result = await createIdea({
        title: idea.title,
        priority: idea.priority || "medium",
        project: idea.related_project || undefined,
        status: idea.status || "captured",
      });
      if (result.success) {
        created++;
        console.log(`  ✓ "${idea.title}"`);
      } else {
        console.error(`  ✗ "${idea.title}": ${result.error}`);
      }
      await sleep(100); // Rate limit
    } catch (err: any) {
      console.error(`  ✗ "${idea.title}": ${err.message}`);
    }
  }

  console.log(`  → Created ${created}/${ideas.length} ideas`);
  return created;
}

async function migrateExpenses(db: Database.Database) {
  console.log("\n💰 Migrating expenses...");
  const expenses = db
    .prepare(
      "SELECT id, description, amount, category, date, vendor FROM expenses ORDER BY date DESC"
    )
    .all() as Expense[];

  let created = 0;
  for (const expense of expenses) {
    try {
      const result = await createExpense({
        description: expense.description,
        amount: expense.amount,
        category: expense.category || undefined,
        vendor: expense.vendor || undefined,
        date: expense.date || undefined,
      });
      if (result.success) {
        created++;
        if (created % 10 === 0) console.log(`  ✓ ${created} expenses...`);
      } else {
        console.error(`  ✗ "${expense.description}": ${result.error}`);
      }
      await sleep(50); // Rate limit
    } catch (err: any) {
      console.error(`  ✗ "${expense.description}": ${err.message}`);
    }
  }

  console.log(`  → Created ${created}/${expenses.length} expenses`);
  return created;
}

async function main() {
  try {
    console.log("🚀 Starting migration: muther.db → Airtable\n");
    console.log(`📍 Source: ${dbPath}`);

    const db = new Database(dbPath);

    const todoCount = await migrateTodos(db);
    const ideaCount = await migrateIdeas(db);
    const expenseCount = await migrateExpenses(db);

    db.close();

    console.log("\n✅ Migration complete!");
    console.log(
      `   Migrated: ${todoCount} tasks + ${ideaCount} ideas + ${expenseCount} expenses`
    );
    console.log("\n📊 Check Motherdeck at http://localhost:3000");
  } catch (err: any) {
    console.error("\n❌ Migration failed:", err.message);
    process.exit(1);
  }
}

main();
