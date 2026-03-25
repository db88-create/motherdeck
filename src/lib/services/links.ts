/**
 * Links Service
 * Manages cross-domain relationships via EntityLinks table
 */

import { fetchAll, createRecord, deleteRecord } from "@/lib/airtable";

export interface EntityLink {
  id: string;
  sourceType: "task" | "inbox" | "focus" | "note";
  sourceId: string;
  targetType: "project" | "workstream" | "linear_issue" | "task" | "note";
  targetId: string;
  relationshipType: "linked" | "promoted_from" | "blocks" | "child_of";
  createdAt: string;
}

export const LinkService = {
  /**
   * Create a link between two entities
   */
  async link(
    sourceType: EntityLink["sourceType"],
    sourceId: string,
    targetType: EntityLink["targetType"],
    targetId: string,
    relationshipType: EntityLink["relationshipType"] = "linked"
  ): Promise<EntityLink> {
    const record = await createRecord("EntityLinks", {
      SourceType: sourceType,
      SourceId: sourceId,
      TargetType: targetType,
      TargetId: targetId,
      RelationshipType: relationshipType,
    });

    return mapRecordToLink(record);
  },

  /**
   * Get all links for a source entity
   */
  async getLinksFor(sourceType: EntityLink["sourceType"], sourceId: string): Promise<EntityLink[]> {
    const records = await fetchAll("EntityLinks", {
      filterByFormula: `AND({SourceType}="${sourceType}",{SourceId}="${sourceId}")`,
    });
    return records.map(mapRecordToLink);
  },

  /**
   * Get all links pointing to a target
   */
  async getLinksTo(targetType: EntityLink["targetType"], targetId: string): Promise<EntityLink[]> {
    const records = await fetchAll("EntityLinks", {
      filterByFormula: `AND({TargetType}="${targetType}",{TargetId}="${targetId}")`,
    });
    return records.map(mapRecordToLink);
  },

  /**
   * Delete a link
   */
  async unlink(linkId: string): Promise<void> {
    await deleteRecord("EntityLinks", linkId);
  },

  /**
   * Delete all links from a source
   */
  async unlinkAll(sourceType: EntityLink["sourceType"], sourceId: string): Promise<void> {
    const links = await LinkService.getLinksFor(sourceType, sourceId);
    for (const link of links) {
      await deleteRecord("EntityLinks", link.id);
    }
  },
};

function mapRecordToLink(record: any): EntityLink {
  return {
    id: record.id,
    sourceType: record.fields.SourceType,
    sourceId: record.fields.SourceId,
    targetType: record.fields.TargetType,
    targetId: record.fields.TargetId,
    relationshipType: record.fields.RelationshipType || "linked",
    createdAt: record.createdTime,
  };
}
