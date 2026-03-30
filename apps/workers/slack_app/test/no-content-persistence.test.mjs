import fs from "node:fs";

const src = fs.readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

const forbidden = ["text", "blocks", "attachments", "files", "permalink"];
const guardedTables = [
  "action_log",
  "telemetry_aggregates",
  "idempotency_keys",
  "confirmation_requests",
  "channel_policy",
  "channel_routing_map"
];

for (const table of guardedTables) {
  const pattern = new RegExp(`INSERT\\s+INTO\\s+${table}[^` + "`" + `]*`, "gi");
  const matches = src.match(pattern) ?? [];
  for (const sql of matches) {
    const lower = sql.toLowerCase();
    for (const key of forbidden) {
      if (new RegExp(`\\b${key}\\b`).test(lower)) {
        throw new Error(`Forbidden persisted field '${key}' found in SQL for table ${table}: ${sql}`);
      }
    }
  }
}

if (!src.includes("assertNoContentPersistence")) {
  throw new Error("Missing no-content persistence guard call");
}

console.log("no-content-persistence checks passed");
