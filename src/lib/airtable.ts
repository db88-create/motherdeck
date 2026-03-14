import Airtable from "airtable";

let _base: Airtable.Base | null = null;

export function getBase(): Airtable.Base {
  if (!_base) {
    const pat = process.env.AIRTABLE_PAT;
    const baseId = process.env.AIRTABLE_BASE_ID;
    if (!pat || !baseId) {
      throw new Error("Missing AIRTABLE_PAT or AIRTABLE_BASE_ID env vars");
    }
    Airtable.configure({ apiKey: pat });
    _base = Airtable.base(baseId);
  }
  return _base;
}

// Generic fetch all records from a table
export async function fetchAll<T>(
  tableName: string,
  options?: {
    filterByFormula?: string;
    sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
    maxRecords?: number;
    view?: string;
  }
): Promise<Array<{ id: string; fields: T }>> {
  const base = getBase();
  const records: Array<{ id: string; fields: T }> = [];

  await new Promise<void>((resolve, reject) => {
    const query = base(tableName).select({
      ...(options?.filterByFormula && {
        filterByFormula: options.filterByFormula,
      }),
      ...(options?.sort && { sort: options.sort }),
      ...(options?.maxRecords && { maxRecords: options.maxRecords }),
      ...(options?.view && { view: options.view }),
    });

    query.eachPage(
      (pageRecords, fetchNextPage) => {
        for (const record of pageRecords) {
          records.push({
            id: record.id,
            fields: record.fields as T,
          });
        }
        fetchNextPage();
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  return records;
}

// Create a record
export async function createRecord<T>(
  tableName: string,
  fields: Partial<T>
): Promise<{ id: string; fields: T }> {
  const base = getBase();
  const records = await base(tableName).create([{ fields: fields as any }]);
  const record = records[0];
  return { id: record.id, fields: record.fields as T };
}

// Update a record
export async function updateRecord<T>(
  tableName: string,
  id: string,
  fields: Partial<T>
): Promise<{ id: string; fields: T }> {
  const base = getBase();
  const record = await base(tableName).update(id, fields as any);
  return { id: record.id, fields: record.fields as T };
}

// Delete a record
export async function deleteRecord(
  tableName: string,
  id: string
): Promise<void> {
  const base = getBase();
  await base(tableName).destroy(id);
}

// Batch create records (max 10 per call per Airtable limits)
export async function batchCreate<T>(
  tableName: string,
  records: Array<{ fields: Partial<T> }>
): Promise<Array<{ id: string; fields: T }>> {
  const base = getBase();
  const results: Array<{ id: string; fields: T }> = [];

  // Airtable allows max 10 records per batch
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const created = await base(tableName).create(
      batch.map((r) => ({ fields: r.fields as any }))
    );
    for (const record of created) {
      results.push({ id: record.id, fields: record.fields as T });
    }
  }

  return results;
}

// Batch update records
export async function batchUpdate<T>(
  tableName: string,
  records: Array<{ id: string; fields: Partial<T> }>
): Promise<Array<{ id: string; fields: T }>> {
  const base = getBase();
  const results: Array<{ id: string; fields: T }> = [];

  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const updated = await base(tableName).update(
      batch.map((r) => ({ id: r.id, fields: r.fields as any }))
    );
    for (const record of updated) {
      results.push({ id: record.id, fields: record.fields as T });
    }
  }

  return results;
}
