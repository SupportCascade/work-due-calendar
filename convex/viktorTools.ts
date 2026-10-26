/**
 * Viktor Tools - Call any Viktor SDK function from your Convex app.
 *
 * Available tools include:
 * - quick_ai_search: AI-powered web search with summarized results
 * - text2im: Generate images from text prompts
 * - file_to_markdown: Convert PDF/DOCX/XLSX files to markdown
 * - And all MCP integration tools configured for your user
 *
 * To add a new tool, first test it to see the response shape.
 */
import { v } from "convex/values";
import { action } from "./_generated/server";
import { authenticatedAction } from "./functions";

declare const process: { env: Record<string, string | undefined> };

const VIKTOR_API_URL = process.env.VIKTOR_SPACES_API_URL!;
const PROJECT_NAME = process.env.VIKTOR_SPACES_PROJECT_NAME!;
const PROJECT_SECRET = process.env.VIKTOR_SPACES_PROJECT_SECRET!;
// Identifies this space across workspaces (project names are only unique per
// owner). Set at init; undefined on deployments that predate it, in which
// case the backend resolves the space from the name + secret.
const SPACE_ID = process.env.VIKTOR_AUTH_RESOURCE_ID;

async function callTool<T>(
  role: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(
    `${VIKTOR_API_URL}/api/viktor-spaces/tools/call`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: PROJECT_NAME,
        project_secret: PROJECT_SECRET,
        space_id: SPACE_ID,
        role,
        arguments: args,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error ?? "Tool call failed");
  }
  return json.result as T;
}

export const quickAiSearch = authenticatedAction({
  args: { query: v.string() },
  returns: v.string(),
  handler: async (_ctx, { query }) => {
    const result = await callTool<{ search_response: string }>(
      "quick_ai_search",
      {
        search_question: query,
      },
    );
    return result.search_response;
  },
});

export const generateImage = authenticatedAction({
  args: {
    prompt: v.string(),
    aspectRatio: v.optional(
      v.union(
        v.literal("1:1"),
        v.literal("16:9"),
        v.literal("9:16"),
        v.literal("4:3"),
        v.literal("3:2"),
      ),
    ),
  },
  returns: v.string(),
  handler: async (_ctx, { prompt, aspectRatio }) => {
    const result = await callTool<{ response_text: string }>("text2im", {
      prompt,
      aspect_ratio: aspectRatio ?? "1:1",
    });
    return result.response_text;
  },
});

const AIRTABLE_BASE_ID = "appKzWCRwAuXTXZKd";
const WORK_ITEMS_TABLE_ID = "tbl4xDrjfZeC6OAqQ";
const TEAM_MEMBERS_TABLE_ID = "tblhtdGnfdQc90apt";
const CLIENTS_TABLE_ID = "tblOUMt8gNOiGnZVZ";

type AirtableRecord = {
  id: string;
  fields?: Record<string, unknown>;
};

type AirtableToolResult = {
  content?: string;
  error?: string;
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

function parseAirtableRecords(
  result: AirtableToolResult | AirtableRecord[] | string,
) {
  let payload: unknown = result;

  if (typeof payload === "string") {
    payload = JSON.parse(payload);
  } else if (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload)
  ) {
    const toolResult = payload as AirtableToolResult;
    if (toolResult.error) {
      throw new Error(toolResult.error);
    }
    if (typeof toolResult.content === "string") {
      payload = JSON.parse(toolResult.content);
    }
  }

  if (Array.isArray(payload)) {
    return payload as AirtableRecord[];
  }
  if (
    payload &&
    typeof payload === "object" &&
    "records" in payload &&
    Array.isArray(payload.records)
  ) {
    return payload.records as AirtableRecord[];
  }
  throw new Error("Airtable returned an unexpected records response.");
}

async function listAirtableRecords(tableId: string) {
  const result = await callTool<AirtableToolResult | AirtableRecord[] | string>(
    "mcp_pd_airtable_oauth_list_records",
    {
      baseId: AIRTABLE_BASE_ID,
      tableId,
    },
  );
  return parseAirtableRecords(result);
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Deliberately anonymous, read-only access for the user's public preview link.
// The handler accepts no caller-controlled table, filter, or record arguments.
export const getWorkCalendar = action({
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
