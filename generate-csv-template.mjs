/**
 * Generates clean CSV templates for direct Supabase table import
 * Run: node generate-csv-template.mjs
 */

import { writeFileSync } from "fs";

function toCSV(rows) {
  return rows.map(row =>
    row.map(cell => {
      const s = String(cell ?? "");
      // Quote cells that contain comma, quote, or newline
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  ).join("\n");
}

// ══════════════════════════════════════════════════════════
// 1. external_offices  (upload FIRST)
// ══════════════════════════════════════════════════════════
const officeRows = [
  // exact DB column names — no Arabic, no spaces
  ["office_name","type","country","code","email","phone","notes"],
  // sample rows
  ["مكتب النور - أديس أبابا","office","ethiopia","ET-001","noor@example.com","+251911000000",""],
  ["محمد علي - نيروبي","person","kenya","","","+254700000000","سمسار مباشر"],
  ["مكتب مانيلا","office","philippines","PH-001","","",""],
];

writeFileSync("import_1_external_offices.csv", toCSV(officeRows), "utf8");
console.log("✅ import_1_external_offices.csv");

// ══════════════════════════════════════════════════════════
// 2. cvs  (upload SECOND — needs external_office_id UUID)
// ══════════════════════════════════════════════════════════
// IMPORTANT: external_office_id must be the UUID from the external_offices table.
// To get it: Supabase Dashboard → Table Editor → external_offices → copy the id column value.

const cvRows = [
  [
    "worker_name",
    "passport_number",
    "date_of_birth",       // DATE — format: YYYY-MM-DD 00:00:00
    "nationality",         // ethiopia | kenya | uganda | philippines | india
    "profession",          // housemaid | private_driver  (india = private_driver only)
    "religion",            // muslim | christian
    "marital_status",      // single | married | divorced | widowed  (optional)
    "children_count",      // integer, default 0
    "salary",              // numeric (SAR)
    "new_or_experienced",  // new | experienced
    "medical_exam_date",   // DATE — format: YYYY-MM-DD 00:00:00
    "musaned_status",      // uploaded | not_uploaded
    "internal_status",     // accepted | rejected
    "external_office_status", // ready | cancel | not_available
    "external_office_id",  // ⚠️ UUID from external_offices table — get from Supabase dashboard
    "broker_name",         // text (optional)
    "photo_url",           // URL (optional)
    "profile_photo",       // URL (optional)
    "video_url",           // URL (optional)
  ],
  // sample row — replace external_office_id with real UUID from your DB
  [
    "أميرة تيفيري",
    "EP1234567",
    "1998-03-15 00:00:00",
    "ethiopia",
    "housemaid",
    "christian",
    "single",
    "0",
    "1200",
    "new",
    "2025-01-10 00:00:00",
    "uploaded",
    "accepted",
    "ready",
    "PASTE-UUID-HERE",
    "",
    "",
    "",
    "",
  ],
  [
    "ماريا سانتوس",
    "PP9876543",
    "1996-07-22 00:00:00",
    "philippines",
    "housemaid",
    "christian",
    "married",
    "2",
    "1400",
    "experienced",
    "2025-02-01 00:00:00",
    "uploaded",
    "accepted",
    "ready",
    "PASTE-UUID-HERE",
    "",
    "",
    "",
    "",
  ],
];

writeFileSync("import_2_cvs.csv", toCSV(cvRows), "utf8");
console.log("✅ import_2_cvs.csv");

// ══════════════════════════════════════════════════════════
// 3. orders  (upload THIRD)
// ══════════════════════════════════════════════════════════
const orderRows = [
  [
    "client_name",
    "phone",
    "national_id",
    "nationality",        // ethiopia | kenya | uganda | philippines | india
    "profession",         // housemaid | private_driver
    "order_type",         // by_specs | named_worker
    "order_status",       // selected | contracted | medical_exam | mol_approval | needs_agency | agency_done | embassy_submitted | visa_issued | ticket_booked | arrived | cancelled
    "date_of_birth",      // DATE — YYYY-MM-DD 00:00:00 (optional)
    "visa_number",        // unique (optional)
    "passport_number",    // FK → cvs.passport_number (optional)
    "worker_name",        // text (optional)
    "external_office",    // text (optional)
    "contract_number",    // unique (optional — triggers auto contract creation)
    "contract_date",      // DATE — YYYY-MM-DD 00:00:00 (optional)
    "client_city",        // text (optional)
    "delivery_method",    // pickup_from_office | send_to_client (optional)
    "notes",              // text (optional)
  ],
  [
    "محمد سعد العمري",
    "0501234567",
    "1090123456",
    "ethiopia",
    "housemaid",
    "named_worker",
    "contracted",
    "",
    "",
    "EP1234567",
    "أميرة تيفيري",
    "مكتب النور",
    "HS-2025-001",
    "2025-01-15 00:00:00",
    "الرياض",
    "send_to_client",
    "",
  ],
  [
    "فهد ناصر القحطاني",
    "0559876543",
    "1085432100",
    "philippines",
    "housemaid",
    "by_specs",
    "selected",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "جدة",
    "pickup_from_office",
    "",
  ],
];

writeFileSync("import_3_orders.csv", toCSV(orderRows), "utf8");
console.log("✅ import_3_orders.csv");

console.log("\n📋 Upload order:");
console.log("  1. import_1_external_offices.csv → Table: external_offices");
console.log("  2. import_2_cvs.csv              → Table: cvs  (fill in external_office_id UUIDs first!)");
console.log("  3. import_3_orders.csv           → Table: orders");
console.log("\n⚠️  For import_2_cvs.csv:");
console.log("  Go to Supabase → Table Editor → external_offices");
console.log("  Copy the 'id' value (UUID) for each office");
console.log("  Replace 'PASTE-UUID-HERE' with the real UUID");
