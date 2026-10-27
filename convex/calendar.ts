/**
 * Work calendar data, read straight from Airtable with the deployment's
 * AIRTABLE_TOKEN (a personal access token with data.records:read on the base).
 */
import { v } from "convex/values";
import { authenticatedAction } from "./functions";

declare const process: { env: Record<string, string | undefined> };

const AIRTABLE_BASE_ID = "appKzWCRwAuXTXZKd";
const WORK_ITEMS_TABLE_ID = "tbl4xDrjfZeC6OAqQ";
const TEAM_MEMBERS_TABLE_ID = "tblhtdGnfdQc90apt";
const CLIENTS_TABLE_ID = "tblOUMt8gNOiGnZVZ";

type AirtableRecord = {
  id: string;
  fields?: Record<string, unknown>;
};

type CalendarItem = {
  recordId: string;
  name: string;
  dueDate: string | null;
  owner: string[];
  status: string;
  airtableUrl: string;
};

type ReportSchedule = {
  recordId: string;
  clientName: string;
  dueDay: number | null;
  owner: string[];
  airtableUrl: string;
};

async function listAirtableRecords(tableId: string) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    throw new Error("AIRTABLE_TOKEN is not configured on this deployment.");
  }

  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`,
    );
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(
        `Airtable HTTP ${response.status}: ${await response.text()}`,
      );
    }
    const page = (await response.json()) as {
      records?: AirtableRecord[];
      offset?: string;
    };
    records.push(...(page.records ?? []));
    offset = page.offset;
  } while (offset);

  return records;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Read-only, signed-in users only. The handler accepts no caller-controlled
// table, filter, or record arguments.
export const getWorkCalendar = authenticatedAction({
  args: {},
  returns: v.object({
    items: v.array(
      v.object({
        recordId: v.string(),
        name: v.string(),
        dueDate: v.union(v.string(), v.null()),
        owner: v.array(v.string()),
        status: v.string(),
        airtableUrl: v.string(),
      }),
    ),
    reports: v.array(
      v.object({
        recordId: v.string(),
        clientName: v.string(),
        dueDay: v.union(v.number(), v.null()),
        owner: v.array(v.string()),
        airtableUrl: v.string(),
      }),
    ),
    syncedAt: v.string(),
  }),
  handler: async () => {
    const [workItemRecords, teamMemberRecords, clientRecords] =
      await Promise.all([
        listAirtableRecords(WORK_ITEMS_TABLE_ID),
        listAirtableRecords(TEAM_MEMBERS_TABLE_ID),
        listAirtableRecords(CLIENTS_TABLE_ID),
      ]);

    const ownerNames = new Map<string, string>();
    for (const record of teamMemberRecords) {
      const name = asText(record.fields?.Name);
      if (record.id && name) {
        ownerNames.set(record.id, name);
      }
    }

    const items: CalendarItem[] = workItemRecords
      .filter(
        record =>
          asText(record.fields?.["Task Type"]).toLowerCase() !== "hiring",
      )
      .filter(record => Boolean(record.id))
      .map(record => {
        const fields = record.fields ?? {};
        const ownerIds = Array.isArray(fields.Owner)
          ? fields.Owner.filter(
              (value): value is string => typeof value === "string",
            )
          : [];
        const owners = ownerIds
          .map(id => ownerNames.get(id))
          .filter((name): name is string => Boolean(name));
        const fallbackOwner = asText(fields["Owner (text)"]);
        const dueDate = asText(fields["Due Date"]);

        return {
          recordId: record.id,
          name: asText(fields["Work Item Name"]) || "Untitled work item",
          dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null,
          owner: owners.length
            ? owners
            : fallbackOwner
              ? [fallbackOwner]
              : ["Unassigned"],
          status: asText(fields.Status) || "Unknown",
          airtableUrl: `https://airtable.com/${AIRTABLE_BASE_ID}/${WORK_ITEMS_TABLE_ID}/${record.id}`,
        };
      });

    const reports: ReportSchedule[] = clientRecords
      .filter(
        record =>
          Boolean(record.id) &&
          asText(record.fields?.["Client Status"]).toLowerCase() === "active",
      )
      .map(record => {
        const fields = record.fields ?? {};
        const dueDayValue = fields["Report Due Day"];
        const dueDay =
          typeof dueDayValue === "number" &&
          Number.isInteger(dueDayValue) &&
          dueDayValue >= 1 &&
          dueDayValue <= 31
            ? dueDayValue
            : null;
        const strategistIds = Array.isArray(fields.Strategist)
          ? fields.Strategist.filter(
              (value): value is string => typeof value === "string",
            )
          : [];
        const strategists = strategistIds
          .map(id => ownerNames.get(id))
          .filter((name): name is string => Boolean(name));

        return {
          recordId: record.id,
          clientName: asText(fields["Client ID"]) || "Unnamed client",
          dueDay,
          owner: strategists.length ? strategists : ["Unassigned"],
          airtableUrl: `https://airtable.com/${AIRTABLE_BASE_ID}/${CLIENTS_TABLE_ID}/${record.id}`,
        };
      });

    return { items, reports, syncedAt: new Date().toISOString() };
  },
});
