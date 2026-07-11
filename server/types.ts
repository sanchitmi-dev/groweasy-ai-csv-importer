export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description"
] as const;

export const ALLOWED_STATUSES = ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"] as const;

export const ALLOWED_DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots"
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];
export type CrmRecord = Record<CrmField, string>;
export type PreviewRow = Record<string, string>;

export type SkippedRecord = {
  rowNumber: number;
  reason: string;
};

export type ImportResponse = {
  crmFields: CrmField[];
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  provider: "openai" | "fallback";
};
