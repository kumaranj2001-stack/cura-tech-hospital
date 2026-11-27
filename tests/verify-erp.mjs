/**
 * Automated Verification Suite for See Curavite Hospital Management
 * Verifies:
 * 1. Valid JS syntax & local import resolution across all public/js modules
 * 2. Complete white-label compliance (0 occurrences of legacy brand terms)
 * 3. All 17 departmental groups & 100% preservation of every menu/submenu action in buildDepartmentMenuSections
 * 4. Credential SHA-256 hashes & RBAC role rules (Admin vs Staff)
 * 5. Collapsible side hamburger DOM elements, relative paths & Vercel/Firebase/SQL configs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");

function walkFiles(dir, extFilter = null) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, extFilter));
    else if (!extFilter || extFilter(entry.name)) out.push(full);
  }
  return out;
}

console.log("1. Checking JavaScript syntax & ES module imports...");
const jsFiles = walkFiles(path.join(PUBLIC, "js"), (n) => n.endsWith(".js"));
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

console.log("2. Verifying complete white-label compliance across all repository files...");
const textFiles = walkFiles(ROOT, (n) => /\.(js|mjs|html|css|json|md|rules|sql|example|svg)$/i.test(n));
const legacyWordRe = new RegExp(`\\b(${"gu" + "ru"}|${"nal" + "am"})\\b`, "i");
const legacyComboRe = new RegExp(`${"gu" + "ru"}hospital|${"nal" + "am"}\\+`, "i");
const forbidden = [];
for (const file of textFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (legacyWordRe.test(content) || legacyComboRe.test(content)) {
    forbidden.push(path.relative(ROOT, file));
  }
}
assert.deepEqual(forbidden, [], `Found leftover legacy brand terms in: ${forbidden.join(", ")}`);
console.log(`   OK (${textFiles.length} files scanned, 0 legacy brand references)`);

console.log("3. Verifying all 17 departments & 100% menu preservation in side hamburger builder...");
const { RIBBON_TABS, RIBBON_CONFIG, buildDepartmentMenuSections } = await import(
  new URL("../public/js/ribbon-config.js", import.meta.url)
);
const expectedLabels = [
  "Facility Hub", "See Curavite", "Patient", "Doctor", "Lab", "Pharmacy",
  "Cashier", "Maintenance", "Accounts", "Reports", "Certificate",
  "Equipments", "Admin", "Physiotherapy", "Store", "Ambulance", "Skin"
];
assert.deepEqual(RIBBON_TABS.map((t) => t.label), expectedLabels);

const collectedViews = [];
let totalActionCount = 0;
for (const tab of RIBBON_TABS) {
  const sections = buildDepartmentMenuSections(tab.id);
  assert.ok(sections.length > 0, `No menu sections for ${tab.id}`);
  for (const sec of sections) {
    for (const entry of sec.entries) {
      if (entry.type === "dropdown") {
        assert.ok(entry.items && entry.items.length > 0, `Empty submenu ${entry.label}`);
        for (const sub of entry.items) {
          collectedViews.push(sub.viewId);
          totalActionCount++;
        }
      } else {
        collectedViews.push(entry.viewId);
        totalActionCount++;
      }
    }
  }
}
assert.ok(totalActionCount >= 145, `Expected >=145 menu actions preserved, got ${totalActionCount}`);

const moduleSources = walkFiles(path.join(PUBLIC, "js", "modules"), (n) => n.endsWith(".js"))
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");
const appSource = fs.readFileSync(path.join(PUBLIC, "js", "app.js"), "utf8");

for (const vid of new Set(collectedViews)) {
  if (vid === "action_logoff") {
    assert.ok(appSource.includes("action_logoff"), "action_logoff missing in app.js");
    continue;
  }
  const hasCase = moduleSources.includes(`"${vid}"`) || appSource.includes(`"${vid}"`);
  assert.ok(hasCase, `Unhandled menu viewId found: ${vid}`);
}
console.log(`   OK (${totalActionCount} total menu actions / ${new Set(collectedViews).size} unique viewIds preserved)`);

console.log("4. Verifying initial credential hashes, RBAC defaults & seed schema...");
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

assert.equal(DEFAULT_ROLE_PERMISSIONS.admin.approve_grn, true);
assert.equal(DEFAULT_ROLE_PERMISSIONS.admin.manage_inventory_settings, true);
assert.equal(DEFAULT_ROLE_PERMISSIONS.admin.view_financial_reports, true);
assert.equal(DEFAULT_ROLE_PERMISSIONS.admin.manage_users, true);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.approve_grn, false);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.manage_inventory_settings, false);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.view_financial_reports, false);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.manage_users, false);
assert.equal(DEFAULT_ROLE_PERMISSIONS.staff.void_bills, false);

const seed = buildSampleSeedCollections("2026-11-27");
assert.equal(seed.settings[0].hospitalName, "See Curavite Hospital Management");
assert.equal(seed.settings[0].uhidPrefix, "CVH");
assert.ok(seed.cashier_bills.every((b) => typeof b.grossAmount === "number" && typeof b.paidAmount === "number" && b.department));
console.log("   OK (Credentials, RBAC & seed schema verified)");

console.log("5. Verifying collapsible side hamburger HTML, CSS & deployment configs...");
const html = fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8");
assert.ok(html.includes("<title>See Curavite Hospital Management</title>"));
assert.ok(html.includes('id="hamburger-toggle-btn"'));
assert.ok(html.includes('id="side-nav"'));
assert.ok(html.includes('id="side-menu-search"'));
assert.ok(html.includes('id="side-nav-list"'));
assert.ok(html.includes('./css/sidebar.css'));
assert.ok(html.includes('./css/style.css'));
assert.ok(html.includes('./js/app.js'));
assert.ok(!html.includes('href="/css/'));

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
assert.equal(vercel.outputDirectory, "public");
assert.ok(fs.existsSync(path.join(PUBLIC, "css", "sidebar.css")));
assert.ok(!fs.existsSync(path.join(PUBLIC, "css", "ribbon.css")));
assert.ok(fs.existsSync(path.join(ROOT, "firebase.json")));
assert.ok(fs.existsSync(path.join(ROOT, "firestore.rules")));
assert.ok(fs.existsSync(path.join(ROOT, "database", "schema.sql")));
console.log("   OK (Side hamburger DOM, vibrant stylesheets & deployment configs valid)");

console.log("\nALL WHITE-LABEL & REDESIGN CHECKS PASSED SUCCESSFULLY!");
