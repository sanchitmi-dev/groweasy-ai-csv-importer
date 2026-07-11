import { describe, expect, it } from "vitest";
import { extractWithFallback } from "./extractor.js";

describe("fallback CRM extraction", () => {
  it("maps varied lead rows and skips rows without contact details", () => {
    const result = extractWithFallback([
      {
        "Customer Name": "John Doe",
        "Primary Email": "john@example.com, john.alt@example.com",
        Phone: "+91 98765 43210",
        Remarks: "Interested in meridian tower, follow up tomorrow",
        City: "Mumbai"
      },
      {
        Name: "No Contact",
        Notes: "No useful contact information"
      }
    ]);

    expect(result.totalImported).toBe(1);
    expect(result.totalSkipped).toBe(1);
    expect(result.records[0].name).toBe("John Doe");
    expect(result.records[0].email).toBe("john@example.com");
    expect(result.records[0].country_code).toBe("+91");
    expect(result.records[0].mobile_without_country_code).toBe("9876543210");
    expect(result.records[0].data_source).toBe("meridian_tower");
    expect(result.records[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(result.records[0].crm_note).toContain("john.alt@example.com");
  });
});
