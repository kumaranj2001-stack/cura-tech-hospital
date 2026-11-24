import assert from "node:assert/strict";
import http from "node:http";
import WebSocket from "ws";
import { setupWebSocketServer, evaluateVitalsAnomaly } from "./websocket.mjs";

console.log("====================================================");
console.log("TESTING REAL-TIME CLINICAL WEBSOCKET EVENT BUS");
console.log("====================================================\n");

// 1. Test vitals anomaly evaluation algorithm
console.log("1. Testing vitals anomaly detection logic...");
const normalVitals = { bpSys: 120, bpDia: 80, spo2: 98, pulse: 74, temp: 98.6 };
const evalNormal = evaluateVitalsAnomaly(normalVitals);
assert.equal(evalNormal.isCritical, false, "Normal vitals must not trigger critical anomaly");

const criticalVitals = { bpSys: 185, bpDia: 110, spo2: 88, pulse: 128, temp: 102.4 };
const evalCrit = evaluateVitalsAnomaly(criticalVitals);
assert.equal(evalCrit.isCritical, true, "Critical vitals must be flagged as critical");
assert.ok(evalCrit.anomalies.some((a) => a.includes("Hypoxia")), "Must detect Hypoxia");
assert.ok(evalCrit.anomalies.some((a) => a.includes("Hypertension")), "Must detect Severe Hypertension");
assert.ok(evalCrit.anomalies.some((a) => a.includes("Tachycardia")), "Must detect Tachycardia");
assert.ok(evalCrit.anomalies.some((a) => a.includes("Pyrexia")), "Must detect High Pyrexia");
console.log("✓ Vitals evaluation algorithm passed.\n");

// 2. Setup mock server & test real-time WebSocket communication
console.log("2. Testing live WebSocket bi-directional clinical event propagation...");

const testServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
});

setupWebSocketServer(testServer);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  const wsUrl = `ws://localhost:${port}/ws`;

  // Create Doctor Client
  const doctorWs = new WebSocket(wsUrl);
  // Create Nurse Client
  const nurseWs = new WebSocket(wsUrl);
  // Create Pharmacist Client
  const pharmaWs = new WebSocket(wsUrl);

  const doctorReceived = [];
  const nurseReceived = [];
  const pharmaReceived = [];

  doctorWs.on("message", (data) => doctorReceived.push(JSON.parse(data.toString())));
  nurseWs.on("message", (data) => nurseReceived.push(JSON.parse(data.toString())));
  pharmaWs.on("message", (data) => pharmaReceived.push(JSON.parse(data.toString())));

  // Wait for connections
  await new Promise((r) => setTimeout(r, 100));

  // Register clients
  doctorWs.send(JSON.stringify({
    type: "REGISTER_CLIENT",
    payload: { role: "doctor", userId: "doc_101", userName: "Dr. Arvind Raman" }
  }));

  nurseWs.send(JSON.stringify({
    type: "REGISTER_CLIENT",
    payload: { role: "nurse", userId: "nurse_202", userName: "Sarah Thomas, RN" }
  }));

  pharmaWs.send(JSON.stringify({
    type: "REGISTER_CLIENT",
    payload: { role: "pharmacist", userId: "pharma_303", userName: "Ananya Iyer" }
  }));

  await new Promise((r) => setTimeout(r, 100));

  // 3. Nurse records critical vitals
  console.log("3. Testing Nurse vitals entry triggering Physician Critical Alert...");
  nurseWs.send(JSON.stringify({
    type: "NURSE_VITALS_RECORDED",
    payload: {
      patientId: "P_101",
      patientName: "Meenakshi Sundaram",
      patientUhid: "UHID-2026-0012",
      bedNumber: "ICU Bed 04",
      vitals: { bpSys: 175, bpDia: 105, spo2: 89, pulse: 122, temp: 99.2 },
      nurseName: "Sarah Thomas, RN",
      doctorId: "doc_101",
      doctorName: "Dr. Arvind Raman"
    }
  }));

  await new Promise((r) => setTimeout(r, 150));

  // Doctor must receive PHYSICIAN_CRITICAL_ALERT
  const criticalAlertMsg = doctorReceived.find((m) => m.type === "PHYSICIAN_CRITICAL_ALERT");
  assert.ok(criticalAlertMsg, "Doctor must receive immediate targeted PHYSICIAN_CRITICAL_ALERT");
  assert.equal(criticalAlertMsg.payload.patientName, "Meenakshi Sundaram");
  assert.equal(criticalAlertMsg.payload.severity, "CRITICAL");
  console.log("✓ Targeted Physician Critical Alert verified.\n");

  // 4. Nurse administers medication with refill flag
  console.log("4. Testing Medication Administration Record (MAR) propagation...");
  nurseWs.send(JSON.stringify({
    type: "MEDICATION_ADMINISTERED",
    payload: {
      patientId: "P_101",
      patientName: "Meenakshi Sundaram",
      patientUhid: "UHID-2026-0012",
      medication: "Inj. Furosemide (Lasix)",
      dose: "40 mg IV Stat",
      route: "Intravenous",
      nurseName: "Sarah Thomas, RN",
      doctorId: "doc_101",
      requiresRefill: true,
    }
  }));

  await new Promise((r) => setTimeout(r, 150));

  // Doctor should receive notification
  const docNotification = doctorReceived.find((m) => m.type === "PHYSICIAN_NOTIFICATION" && m.payload.title.includes("Medication Given"));
  assert.ok(docNotification, "Doctor must be notified of administered medication");

  // Pharmacist must receive replenishment request
  const pharmaRefill = pharmaReceived.find((m) => m.type === "PHARMACY_REFILL_INITIATED");
  assert.ok(pharmaRefill, "Pharmacy must receive automated refill request without manual refresh");
  console.log("✓ Medication Administration & automated Pharmacy refill verified.\n");

  // 5. Automated Lab Request initiation
  console.log("5. Testing automated Lab Diagnostic request routing...");
  doctorWs.send(JSON.stringify({
    type: "INITIATE_LAB_REQUEST",
    payload: {
      patientId: "P_101",
      patientName: "Meenakshi Sundaram",
      patientUhid: "UHID-2026-0012",
      testName: "Serum Electrolytes & Troponin-I Stat",
      priority: "Emergency Stat",
      doctorName: "Dr. Arvind Raman"
    }
  }));

  await new Promise((r) => setTimeout(r, 150));
  const orderAck = doctorReceived.find((m) => m.type === "ORDER_CONFIRMED" && m.payload.service === "Diagnostic Lab");
  assert.ok(orderAck, "Order confirmation must be delivered back to doctor workstation");
  console.log("✓ Automated Diagnostic Lab order routing verified.\n");

  // Clean up
  doctorWs.close();
  nurseWs.close();
  pharmaWs.close();
  testServer.close();

  console.log("====================================================");
  console.log("ALL REAL-TIME WEBSOCKET CLINICAL TESTS PASSED!");
  console.log("====================================================");
});
