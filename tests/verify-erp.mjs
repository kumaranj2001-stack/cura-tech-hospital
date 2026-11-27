/**
 * Automated Verification Suite for Guru Hospital (Nalam+ ERP)
 * Verifies:
 * 1. Valid JS syntax across every module file
 * 2. All 16 departmental tabs + Facility Hub button & complete ribbon view coverage
 * 3. Credential SHA-256 hashes & RBAC role rules (Admin vs Staff)
 * 4. Relative path hygiene in public/index.html (Live Server + Vercel compatibility)
 * 5. Deployment config integrity (vercel.json, firebase.json, firestore.rules, database/schema.sql)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");

function walkJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsFiles(full));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

console.log("1. Checking JavaScript syntax across all public/js modules...");
const jsFiles = walkJsFiles(path.join(PUBLIC, "js"));
assert.ok(jsFiles.length >= 18, `Expected >=18 JS files, found ${jsFiles.length}`);
for (const file of jsFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const resolved = path.resolve(path.dirname(file), m[1]);
    assert.ok(fs.existsSync(resolved), `Missing local import ${m[1]} in ${file}`);
  }
}
console.log(`   OK (${jsFiles.length} files syntax-valid & all local imports resolved)`);

console.log("2. Verifying 16 departmental tabs + Facility Hub & all ribbon viewIds...");
const { RIBBON_TABS, RIBBON_CONFIG } = await import(new URL("../public/js/ribbon-config.js", import.meta.url));
const expectedLabels = [
  "Facility Hub", "Nalam+", "Patient", "Doctor", "Lab", "Pharmacy",
  "Cashier", "Maintenance", "Accounts", "Reports", "Certificate",
  "Equipments", "Admin", "Physiotherapy", "Store", "Ambulance", "Skin"
];
assert.deepEqual(RIBBON_TABS.map((t) => t.label), expectedLabels);

const collectedViews = [];
for (const [tabId, sections] of Object.entries(RIBBON_CONFIG)) {
  assert.ok(Array.isArray(sections) && sections.length > 0, `Empty sections in tab ${tabId}`);
  for (const sec of sections) {
    for (const item of sec.items) {
      if (item.kind === "stack") {
        for (const r of item.rows) {
          if (r.type === "dropdown") collectedViews.push(...r.items.map((x) => x.viewId));
          else collectedViews.push(r.viewId);
        }
      } else if (item.type === "dropdown") {
        collectedViews.push(...item.items.map((x) => x.viewId));
      } else {
        collectedViews.push(item.viewId);
      }
    }
  }
}

const moduleSources = walkJsFiles(path.join(PUBLIC, "js", "modules"))
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");
const appSource = fs.readFileSync(path.join(PUBLIC, "js", "app.js"), "utf8");

for (const vid of new Set(collectedViews)) {
  if (vid === "action_logoff") {
    assert.ok(appSource.includes("action_logoff"), "action_logoff missing in app.js");
    continue;
  }
  const hasCase = moduleSources.includes(`"${vid}"`) || appSource.includes(`"${vid}"`);
  assert.ok(hasCase, `Unhandled ribbon viewId found: ${vid}`);
}
console.log(`   OK (${new Set(collectedViews).size} unique ribbon views verified)`);

console.log("3. Verifying initial credential hashes & RBAC defaults...");
const { INITIAL_SANDBOX_USERS, DEFAULT_ROLE_PERMISSIONS, buildSampleSeedCollections } = await import(
  new URL("../public/js/seed-data.js", import.meta.url)
);
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const adminUser = INITIAL_SANDBOX_USERS.find((u) => u.username === "kumaran");
const staffUser = INITIAL_SANDBOX_USERS.find((u) => u.username === "staff123");
assert.ok(adminUser && adminUser.role === "admin", "Admin user kumaran missing");
assert.ok(staffUser && staffUser.role === "staff", "Staff user staff123 missing");
assert.equal(adminUser.passwordHash, sha("kumaranjkms"));
assert.equal(staffUser.passwordHash, sha("kumaranjk"));

// Staff restrictions
assert.equal(DEFAULT_ROLE_PERMISSIONS.admin.approve_grn, true);
assert.equal(DEFAULT_ROLE_PERMISSIONS.admin.manage_inventory_settings, true);
assert.equal(DEFAULT_ROLE_PERMISSIONS.admin.view_financial_reports, true);
assert.equal(DEFAULT_ROLE_PERMISSIONS.admin.manage_users, true);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.approve_grn, false);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.manage_inventory_settings, false);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.view_financial_reports, false);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.manage_users, false);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.void_bills, false);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.pharmacy, true);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.cashier, true);
console.log("   OK (Admin/Staff credentials & RBAC permissions verified)");

console.log("4. Verifying seed data schema alignment...");
const seed = buildSampleSeedCollections("2026-11-27");
assert.equal(seed.settings[0].uhidPrefix, "GH");
assert.ok(seed.cashier_bills.every((b) => typeof b.grossAmount === "number" && typeof b.paidAmount === "number" && b.department));
assert.ok(seed.beds.length >= 4 && seed.beds.every((b) => typeof b.dailyRate === "number"));
assert.ok(seed.ip_admissions.every((i) => Array.isArray(i.serviceCharges) && i.dietPlan));
console.log("   OK (Seed collections match module schemas)");

console.log("5. Verifying HTML paths & Vercel/Firebase/SQL configuration files...");
const html = fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8");
assert.ok(html.includes('./css/style.css'), "Relative CSS path expected for Live Server & Vercel compatibility");
assert.ok(html.includes('./js/app.js'), "Relative JS module path expected");
assert.ok(!html.includes('href="/css/'), "Avoid root-absolute /css/ paths so VS Code Live Server works");

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
assert.equal(vercel.outputDirectory, "public");
assert.ok(fs.existsSync(path.join(ROOT, "firebase.json")));
assert.ok(fs.existsSync(path.join(ROOT, "firestore.rules")));
assert.ok(fs.existsSync(path.join(ROOT, "database", "schema.sql")));
console.log("   OK (All deployment & schema configs valid)");

console.log("\nALL CHECKS PASSED SUCCESSFULLY!");
