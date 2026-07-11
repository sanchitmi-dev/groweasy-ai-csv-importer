import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  ALLOWED_DATA_SOURCES,
  ALLOWED_STATUSES,
  CRM_FIELDS,
  type CrmRecord,
  type ImportResponse,
  type PreviewRow,
  type SkippedRecord
} from "./types.js";

const BATCH_SIZE = 25;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+\d{1,3}[\s-]*)?(?:\d[\s().-]*){8,14}\d/g;
const statusHints: Array<[RegExp, (typeof ALLOWED_STATUSES)[number]]> = [
  [/sale|closed|won|deal/i, "SALE_DONE"],
  [/bad|not interested|invalid|junk/i, "BAD_LEAD"],
  [/did not|not connect|no answer|unreachable/i, "DID_NOT_CONNECT"],
  [/follow|good|callback|interested|demo/i, "GOOD_LEAD_FOLLOW_UP"]
];

const crmRecordSchema = z.object(
  Object.fromEntries(CRM_FIELDS.map((field) => [field, z.string().default("")])) as Record<keyof CrmRecord, z.ZodDefault<z.ZodString>>
);

const batchSchema = z.object({
  records: z.array(crmRecordSchema),
  skipped: z.array(z.object({ rowNumber: z.number(), reason: z.string() }))
});

export async function extractCrmRecords(rows: PreviewRow[]): Promise<ImportResponse> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await extractWithOpenAI(rows);
    } catch (error) {
      console.warn("OpenAI extraction failed, falling back to deterministic extraction.", error);
    }
  }

  const fallback = extractWithFallback(rows);
  return { ...fallback, provider: "fallback" };
}

async function extractWithOpenAI(rows: PreviewRow[]): Promise<ImportResponse> {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE).map((row, offset) => ({
      rowNumber: index + offset + 2,
      values: row
    }));

    const result = await retry(async () =>
      generateObject({
        model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
        schema: batchSchema,
        temperature: 0,
        prompt: buildPrompt(batch)
      })
    );

    records.push(...result.object.records.map(normalizeRecord));
    skipped.push(...result.object.skipped);
  }

  const cleanRecords = records.filter((record) => hasContact(record));
  return {
    crmFields: [...CRM_FIELDS],
    records: cleanRecords,
    skipped,
    totalImported: cleanRecords.length,
    totalSkipped: skipped.length,
    provider: "openai"
  };
}

function buildPrompt(batch: Array<{ rowNumber: number; values: PreviewRow }>) {
  return `You extract CRM lead data for GrowEasy from arbitrary CSV rows.

Return structured JSON only. Map any matching source columns into these CRM fields:
${CRM_FIELDS.join(", ")}

Rules:
- crm_status must be one of: ${ALLOWED_STATUSES.join(", ")}. Leave blank if uncertain.
- data_source must be one of: ${ALLOWED_DATA_SOURCES.join(", ")}. Leave blank if uncertain.
- created_at must be convertible by JavaScript new Date(created_at).
- Use crm_note for remarks, follow-up notes, comments, extra phone numbers, extra emails, and useful unmatched details.
- If multiple emails exist, use the first in email and append remaining emails to crm_note.
- If multiple mobile numbers exist, use the first in mobile_without_country_code and append remaining numbers to crm_note.
- Each record must remain a single CSV-compatible row; escape line breaks as \\n.
- Skip rows with neither email nor mobile number and include their rowNumber and reason.

Rows:
${JSON.stringify(batch, null, 2)}`;
}

export function extractWithFallback(rows: PreviewRow[]): Omit<ImportResponse, "provider"> {
  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  rows.forEach((row, index) => {
    const record = mapRow(row);
    if (!hasContact(record)) {
      skipped.push({ rowNumber: index + 2, reason: "No email or mobile number found." });
      return;
    }
    records.push(record);
  });

  return {
    crmFields: [...CRM_FIELDS],
    records,
    skipped,
    totalImported: records.length,
    totalSkipped: skipped.length
  };
}

function mapRow(row: PreviewRow): CrmRecord {
  const contactText = contactValues(row).join(" ");
  const emails = contactEmails(row, contactText);
  const phones = contactPhones(row, contactText);
  const noteParts: string[] = [];
  if (emails.length > 1) noteParts.push(`Extra emails: ${emails.slice(1).join(", ")}`);
  if (phones.length > 1) noteParts.push(`Extra mobiles: ${phones.slice(1).join(", ")}`);

  const note = pick(row, ["note", "remark", "comment", "feedback", "message", "description", "query"]);
  if (note) noteParts.push(note);

  const phone = phones[0] || "";
  const countryCode = inferCountryCode(contactText, phone);

  const record: CrmRecord = {
    created_at: normalizeDate(pick(row, ["created", "date", "time", "timestamp", "submitted", "lead date"])),
    name: pick(row, ["name", "full name", "customer", "lead", "client", "person"]),
    email: emails[0] || pick(row, ["email", "mail"]),
    country_code: countryCode,
    mobile_without_country_code: stripCountryCode(phone, countryCode),
    company: pick(row, ["company", "organization", "organisation", "business", "employer"]),
    city: pick(row, ["city", "location", "town"]),
    state: pick(row, ["state", "province", "region"]),
    country: pick(row, ["country", "nation"]),
    lead_owner: pick(row, ["owner", "assignee", "sales", "agent", "lead owner"]),
    crm_status: inferStatus(row),
    crm_note: sanitize(noteParts.join(" | ")),
    data_source: inferDataSource(row),
    possession_time: pick(row, ["possession", "move in", "handover", "timeline"]),
    description: pick(row, ["description", "requirement", "property", "project", "interest"])
  };

  return normalizeRecord(record);
}

function pick(row: PreviewRow, hints: string[]) {
  const entries = Object.entries(row);
  for (const hint of hints) {
    const direct = entries.find(([key]) => key.toLowerCase().replace(/[_-]/g, " ").includes(hint));
    if (direct?.[1]) return sanitize(direct[1]);
  }
  return "";
}

function contactEmails(row: PreviewRow, fallbackText: string) {
  const direct = Object.entries(row)
    .filter(([key]) => isContactKey(key, ["email", "mail"]) && !isOwnerKey(key))
    .flatMap(([, value]) => value.match(EMAIL_RE) || []);
  const fallback = fallbackText.match(EMAIL_RE) || [];
  return Array.from(new Set(direct.length ? direct : fallback));
}

function contactPhones(row: PreviewRow, fallbackText: string) {
  const direct = Object.entries(row)
    .filter(([key]) => isContactKey(key, ["phone", "mobile", "whatsapp", "contact", "telephone", "tel"]) && !isOwnerKey(key))
    .flatMap(([, value]) => value.match(PHONE_RE) || []);
  const fallback = fallbackText.match(PHONE_RE) || [];
  return Array.from(new Set((direct.length ? direct : fallback).map(cleanPhone).filter((phone) => phone.length >= 8)));
}

function contactValues(row: PreviewRow) {
  return Object.entries(row)
    .filter(([key]) => !isOwnerKey(key) && !isDateKey(key))
    .map(([, value]) => value);
}

function isContactKey(key: string, hints: string[]) {
  const normalized = key.toLowerCase().replace(/[_-]/g, " ");
  return hints.some((hint) => normalized.includes(hint));
}

function isOwnerKey(key: string) {
  return /owner|assignee|sales|agent|assigned/i.test(key);
}

function isDateKey(key: string) {
  return /created|date|time|timestamp|submitted/i.test(key);
}

function inferStatus(row: PreviewRow): CrmRecord["crm_status"] {
  const text = Object.values(row).join(" ");
  return statusHints.find(([pattern]) => pattern.test(text))?.[1] || "";
}

function inferDataSource(row: PreviewRow): CrmRecord["data_source"] {
  const text = Object.values(row).join(" ").toLowerCase().replace(/[\s-]+/g, "_");
  return ALLOWED_DATA_SOURCES.find((source) => text.includes(source)) || "";
}

function inferCountryCode(text: string, phone: string) {
  const match = text.match(/\+(\d{1,3})/);
  if (match) return `+${match[1]}`;
  if (phone.length === 12 && phone.startsWith("91")) return "+91";
  return "";
}

function stripCountryCode(phone: string, countryCode: string) {
  if (!phone) return "";
  const code = countryCode.replace("+", "");
  return code && phone.startsWith(code) ? phone.slice(code.length) : phone;
}

function cleanPhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function normalizeDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function normalizeRecord(record: CrmRecord): CrmRecord {
  const normalized = Object.fromEntries(CRM_FIELDS.map((field) => [field, sanitize(record[field] || "")])) as CrmRecord;
  if (!ALLOWED_STATUSES.includes(normalized.crm_status as (typeof ALLOWED_STATUSES)[number])) normalized.crm_status = "";
  if (!ALLOWED_DATA_SOURCES.includes(normalized.data_source as (typeof ALLOWED_DATA_SOURCES)[number])) normalized.data_source = "";
  return normalized;
}

function sanitize(value: string) {
  return String(value ?? "").replace(/\r?\n/g, "\\n").trim();
}

function hasContact(record: CrmRecord) {
  return Boolean(record.email || record.mobile_without_country_code);
}

async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}
