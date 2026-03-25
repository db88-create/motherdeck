/**
 * Promotion Service
 * Converts raw captures into structured work across domains
 */

import { InboxService, type InboxItem } from "./inbox";
import { WeeklyFocusService } from "./weekly-focus";
import { DailyNoteService } from "./daily-notes";

export interface PromoteOptions {
  projectId?: string;
  workstreamId?: string;
  lane?: "must" | "should" | "carryover";
  dueDate?: string;
}

export const PromoteService = {
  /**
   * Promote inbox item to task (weekly focus item)
   */
  async inboxToTask(inboxId: string, options: PromoteOptions = {}): Promise<string> {
    const inbox = await InboxService.getById(inboxId);
    if (!inbox) throw new Error(`Inbox item ${inboxId} not found`);

    const week = await WeeklyFocusService.getCurrentWeek();
    const focusItem = await WeeklyFocusService.addItem(week.id, inbox.content, Date.now());

    await InboxService.markProcessed(inboxId, {
      linkedTaskId: focusItem.id,
      linkedType: "task",
    });

    return focusItem.id;
  },

  /**
   * Promote inbox item to note (append to persistent note)
   */
  async inboxToNote(inboxId: string): Promise<void> {
    const inbox = await InboxService.getById(inboxId);
    if (!inbox) throw new Error(`Inbox item ${inboxId} not found`);

    const note = await DailyNoteService.getOrCreatePersistent();
    const updatedContent = note.content + `\n• ${inbox.content}`;
    await DailyNoteService.update(note.id, updatedContent);

    await InboxService.markProcessed(inboxId);
  },

  /**
   * Promote inbox item to weekly focus item
   */
  async inboxToFocus(inboxId: string, options: PromoteOptions = {}): Promise<string> {
    const inbox = await InboxService.getById(inboxId);
    if (!inbox) throw new Error(`Inbox item ${inboxId} not found`);

    const week = await WeeklyFocusService.getCurrentWeek();
    if (!week) throw new Error("No current week found");

    const focusItem = await WeeklyFocusService.addItem(week.id, inbox.content, Date.now());

    await InboxService.markProcessed(inboxId);

    return focusItem.id;
  },

  /**
   * Promote inbox item to idea (via Ideas table)
   */
  async inboxToIdea(inboxId: string): Promise<string> {
    const inbox = await InboxService.getById(inboxId);
    if (!inbox) throw new Error(`Inbox item ${inboxId} not found`);

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3002";

    const res = await fetch(`${baseUrl}/api/ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: inbox.content.substring(0, 100),
        description: inbox.content,
        status: "captured",
      }),
    });

    if (!res.ok) throw new Error("Failed to create idea");
    const idea = await res.json();

    await InboxService.markProcessed(inboxId);

    return idea.id;
  },

  /**
   * Promote text selection from daily note to focus item
   */
  async noteSelectionToTask(text: string, options: PromoteOptions = {}): Promise<string> {
    const week = await WeeklyFocusService.getCurrentWeek();
    if (!week) throw new Error("No current week found");
    const focusItem = await WeeklyFocusService.addItem(week.id, text, Date.now());
    return focusItem.id;
  },

  /**
   * Promote text selection from daily note to focus item
   */
  async noteSelectionToFocus(text: string, options: PromoteOptions = {}): Promise<string> {
    const week = await WeeklyFocusService.getCurrentWeek();
    if (!week) throw new Error("No current week found");

    const focusItem = await WeeklyFocusService.addItem(week.id, text, Date.now());
    return focusItem.id;
  },
};
