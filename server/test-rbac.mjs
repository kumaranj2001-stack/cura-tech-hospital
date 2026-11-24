import assert from "node:assert/strict";
import { isPublicPath, isRoleAuthorized, enforceRbac } from "./rbac.mjs";

console.log("==========================================");
console.log("RUNNING HOSPITAL RBAC PERMISSION TESTS");
console.log("==========================================\n");

// 1. Public paths check
console.log("1. Testing public vs protected paths...");
assert.equal(isPublicPath("/api/health"), true, "Health endpoint must be public");
assert.equal(isPublicPath("/api/firebase/status"), true, "Firebase status must be public");
assert.equal(isPublicPath("/api/auth/login"), true, "Auth login must be public");
assert.equal(isPublicPath("/api/patients"), false, "Patients endpoint must be protected");
assert.equal(isPublicPath("/api/invoices"), false, "Invoices endpoint must be protected");
assert.equal(isPublicPath("/api/users"), false, "Users endpoint must be protected");
console.log("✓ Public endpoint rules verified.\n");

// 2. Super Admin & Developer permissions
console.log("2. Testing Super Admin & Developer administrative authority...");
assert.equal(isRoleAuthorized("developer", "POST", "/api/system/purge"), true, "Developer can purge");
assert.equal(isRoleAuthorized("developer", "POST", "/api/users"), true, "Developer can manage users");
assert.equal(isRoleAuthorized("superadmin", "POST", "/api/users"), true, "Super Admin can manage users");
assert.equal(isRoleAuthorized("superadmin", "POST", "/api/branches"), true, "Super Admin can manage branches");
assert.equal(isRoleAuthorized("superadmin", "GET", "/api/patients"), true, "Super Admin can access patient records");
assert.equal(isRoleAuthorized("superadmin", "GET", "/api/invoices"), true, "Super Admin can access financial records");
console.log("✓ Super Admin and Developer unrestricted oversight verified.\n");

// 3. Admin & Admin Pharmacist permissions
console.log("3. Testing Admin & Admin Pharmacist operational permissions...");
for (const adm of ["admin", "admin_pharmacist"]) {
  assert.equal(isRoleAuthorized(adm, "POST", "/api/users"), true, `${adm} can create user accounts`);
  assert.equal(isRoleAuthorized(adm, "PUT", "/api/users/u_123"), true, `${adm} can modify user accounts`);
  assert.equal(isRoleAuthorized(adm, "GET", "/api/patients"), true, `${adm} can access clinical records`);
  assert.equal(isRoleAuthorized(adm, "GET", "/api/invoices"), true, `${adm} can access financial records`);
  assert.equal(isRoleAuthorized(adm, "POST", "/api/inventory/medicine"), true, `${adm} can manage inventory`);
  assert.equal(isRoleAuthorized(adm, "POST", "/api/system/purge"), false, `${adm} cannot purge system`);
}
console.log("✓ Admin and Admin Pharmacist operational authority verified.\n");

// 4. Receptionist permissions (Front-desk operations & revenue cycle)
console.log("4. Testing Receptionist front-desk & billing permissions...");
assert.equal(isRoleAuthorized("receptionist", "GET", "/api/patients"), true, "Receptionist can view patient list");
assert.equal(isRoleAuthorized("receptionist", "POST", "/api/patients"), true, "Receptionist can register patients");
assert.equal(isRoleAuthorized("receptionist", "PUT", "/api/patients/p_1"), true, "Receptionist can update demographics");
assert.equal(isRoleAuthorized("receptionist", "POST", "/api/invoices"), true, "Receptionist can generate invoices");
assert.equal(isRoleAuthorized("receptionist", "POST", "/api/billing/calculate"), true, "Receptionist can process billing");
assert.equal(isRoleAuthorized("receptionist", "POST", "/api/users"), false, "Receptionist cannot manage users");
assert.equal(isRoleAuthorized("receptionist", "POST", "/api/inventory/medicine"), false, "Receptionist cannot edit inventory");
assert.equal(isRoleAuthorized("receptionist", "DELETE", "/api/invoices/inv_1"), false, "Receptionist cannot delete invoices");
console.log("✓ Receptionist front-desk & revenue cycle permissions verified.\n");

// 5. Nurse permissions (Care coordination & vitals)
console.log("5. Testing Nurse clinical care coordination permissions...");
assert.equal(isRoleAuthorized("nurse", "GET", "/api/patients"), true, "Nurse can view assigned patient lists");
assert.equal(isRoleAuthorized("nurse", "GET", "/api/doctors"), true, "Nurse can view doctors");
assert.equal(isRoleAuthorized("nurse", "POST", "/api/audit/log"), true, "Nurse can record nursing vitals/notes");
assert.equal(isRoleAuthorized("nurse", "POST", "/api/invoices"), false, "Nurse cannot generate invoices");
assert.equal(isRoleAuthorized("nurse", "POST", "/api/billing/calculate"), false, "Nurse cannot process billing");
assert.equal(isRoleAuthorized("nurse", "POST", "/api/inventory/medicine"), false, "Nurse cannot modify stock");
assert.equal(isRoleAuthorized("nurse", "POST", "/api/users"), false, "Nurse cannot manage users");
console.log("✓ Nurse patient care coordination permissions verified.\n");

// 6. Doctor permissions (Clinical authority & e-prescriptions)
console.log("6. Testing Doctor comprehensive clinical authority permissions...");
assert.equal(isRoleAuthorized("doctor", "GET", "/api/patients"), true, "Doctor can view medical histories");
assert.equal(isRoleAuthorized("doctor", "PUT", "/api/patients/p_1"), true, "Doctor can update EHR notes");
assert.equal(isRoleAuthorized("doctor", "GET", "/api/inventory/medicines"), true, "Doctor can view drug formulary");
assert.equal(isRoleAuthorized("doctor", "POST", "/api/audit/log"), true, "Doctor can log consultations & prescriptions");
assert.equal(isRoleAuthorized("doctor", "POST", "/api/invoices"), false, "Doctor cannot generate invoices");
assert.equal(isRoleAuthorized("doctor", "POST", "/api/billing/calculate"), false, "Doctor cannot access billing");
assert.equal(isRoleAuthorized("doctor", "POST", "/api/inventory/medicine"), false, "Doctor cannot modify inventory stock");
assert.equal(isRoleAuthorized("doctor", "POST", "/api/users"), false, "Doctor cannot manage users");
console.log("✓ Doctor clinical authority permissions verified.\n");

// 7. Lab Technician permissions (Diagnostics management)
console.log("7. Testing Lab Technician diagnostics management permissions...");
assert.equal(isRoleAuthorized("lab_tech", "GET", "/api/patients"), true, "Lab Tech can view patient info");
assert.equal(isRoleAuthorized("lab_tech", "POST", "/api/audit/log"), true, "Lab Tech can log authorized test results");
assert.equal(isRoleAuthorized("lab_tech", "POST", "/api/invoices"), false, "Lab Tech cannot access billing");
assert.equal(isRoleAuthorized("lab_tech", "POST", "/api/inventory/medicine"), false, "Lab Tech cannot edit inventory");
assert.equal(isRoleAuthorized("lab_tech", "POST", "/api/users"), false, "Lab Tech cannot manage users");
console.log("✓ Lab Technician diagnostics management permissions verified.\n");

// 8. Staff Pharmacist permissions (Medication dispensing & pharmacy sales)
console.log("8. Testing Staff Pharmacist dispensing & pharmacy sales permissions...");
for (const pharmaRole of ["staff_pharmacist", "pharmacist"]) {
  assert.equal(isRoleAuthorized(pharmaRole, "POST", "/api/invoices"), true, `${pharmaRole} can bill medicine sales`);
  assert.equal(isRoleAuthorized(pharmaRole, "POST", "/api/billing/calculate"), true, `${pharmaRole} can calculate billing`);
  assert.equal(isRoleAuthorized(pharmaRole, "GET", "/api/inventory/medicines"), true, `${pharmaRole} can view stock`);
  assert.equal(isRoleAuthorized(pharmaRole, "PUT", "/api/inventory/medicine/m_1"), true, `${pharmaRole} can dispense stock`);
  assert.equal(isRoleAuthorized(pharmaRole, "POST", "/api/users"), false, `${pharmaRole} cannot manage users`);
  assert.equal(isRoleAuthorized(pharmaRole, "POST", "/api/branches"), false, `${pharmaRole} cannot create branches`);
}
console.log("✓ Staff Pharmacist dispensing & pharmacy billing permissions verified.\n");

// 8.5 Cashier, Accountant, Maintenance, Physio, Store, Ambulance, Skin permissions
console.log("8.5 Testing Cashier, Accountant, Maintenance, Physio, Store, Ambulance, Skin permissions...");
assert.equal(isRoleAuthorized("cashier", "POST", "/api/invoices"), true, "Cashier can create invoices");
assert.equal(isRoleAuthorized("cashier", "POST", "/api/cash-close"), true, "Cashier can perform cash close");
assert.equal(isRoleAuthorized("cashier", "POST", "/api/users"), false, "Cashier cannot manage users");

assert.equal(isRoleAuthorized("accountant", "POST", "/api/accounts/expense"), true, "Accountant can record expenses");
assert.equal(isRoleAuthorized("accountant", "POST", "/api/users"), false, "Accountant cannot create users");

assert.equal(isRoleAuthorized("maintenance", "POST", "/api/equipments/service"), true, "Maintenance can log equipment service");
assert.equal(isRoleAuthorized("maintenance", "POST", "/api/invoices"), false, "Maintenance cannot bill");

assert.equal(isRoleAuthorized("physiotherapy", "POST", "/api/physiotherapy/sale"), true, "Physiotherapy can bill physio items");
assert.equal(isRoleAuthorized("physiotherapy", "POST", "/api/users"), false, "Physiotherapy cannot manage users");

assert.equal(isRoleAuthorized("store_manager", "POST", "/api/store/indent"), true, "Store manager can issue indents");
assert.equal(isRoleAuthorized("store_manager", "POST", "/api/users"), false, "Store manager cannot manage users");

assert.equal(isRoleAuthorized("ambulance", "POST", "/api/ambulance/trip"), true, "Ambulance driver can log trips");
assert.equal(isRoleAuthorized("ambulance", "POST", "/api/users"), false, "Ambulance driver cannot manage users");

assert.equal(isRoleAuthorized("skin_specialist", "POST", "/api/skin/procedure"), true, "Skin specialist can log procedures");
assert.equal(isRoleAuthorized("skin_specialist", "POST", "/api/users"), false, "Skin specialist cannot manage users");
console.log("✓ All 17 Hospital ERP roles verified.\n");

// 9. HTTP enforcement integration mock test
console.log("9. Testing HTTP enforceRbac middleware behavior...");
const mockReqPublic = { url: "/api/health", method: "GET", headers: {} };
const mockResPublic = { writeHead() {}, end() {}, setHeader() {} };
assert.equal(enforceRbac(mockReqPublic, mockResPublic), true, "Public route should pass without role");

let errorStatus = 0;
let errorBody = "";
const mockResDeny = {
  setHeader() {},
  writeHead(code) { errorStatus = code; },
  end(payload) { errorBody = payload; },
};

const mockReqNoRole = { url: "/api/patients", method: "GET", headers: {} };
const passNoRole = enforceRbac(mockReqNoRole, mockResDeny);
assert.equal(passNoRole, false, "Unauthenticated request to protected route must be blocked");
assert.equal(errorStatus, 401, "Must return 401 Unauthorized for missing role");

const mockReqUnauthorized = {
  url: "/api/users",
  method: "POST",
  headers: { "x-user-role": "receptionist" },
};
const passUnauthorized = enforceRbac(mockReqUnauthorized, mockResDeny);
assert.equal(passUnauthorized, false, "Unauthorized role action must be blocked");
assert.equal(errorStatus, 403, "Must return 403 Forbidden for unauthorized role");
assert.ok(errorBody.includes("Access Denied"), "Error message must state Access Denied");

const mockReqAuthorized = {
  url: "/api/patients",
  method: "POST",
  headers: { "x-user-role": "receptionist" },
};
assert.equal(enforceRbac(mockReqAuthorized, mockResDeny), true, "Authorized role action must succeed");
console.log("✓ HTTP middleware enforcement verified (401 on missing role, 403 on forbidden role, 200/proceed on allowed).\n");

console.log("==========================================");
console.log("ALL HOSPITAL RBAC PERMISSION TESTS PASSED!");
console.log("==========================================");
