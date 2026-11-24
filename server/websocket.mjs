/**
 * Real-Time WebSocket Server and Clinical Event Synchronization Bus
 * 
 * Implements bidirectional real-time communication for Cura-Tech Hospital ERP:
 * - Subscriptions by role (doctor, nurse, admin, receptionist, pharmacist, lab_tech)
 * - Real-time vitals recording with automated critical anomaly detection
 * - Targeted physician alerts for abnormal vitals (Hypoxia, Tachycardia, Hypertensive Crisis)
 * - Medication administration records (MAR) with automated physician notifications
 * - Automated inter-module dispatch (initiating lab diagnostic orders & pharmacy refill requests)
 * - Global patient profile live synchronization without manual page refreshes
 */

import { WebSocketServer, WebSocket } from "ws";

// Connected client registry: Set of client objects with metadata
const clients = new Map();

// In-memory clinical alerts cache
const activeAlerts = [];

// Helper to evaluate if vitals are critical
export function evaluateVitalsAnomaly(vitals) {
  const anomalies = [];

  const bpSys = Number(vitals.bpSys || vitals.systolic || (vitals.bp ? String(vitals.bp).split("/")[0] : 0));
  const bpDia = Number(vitals.bpDia || vitals.diastolic || (vitals.bp ? String(vitals.bp).split("/")[1] : 0));
  const spo2 = Number(vitals.spo2 || vitals.spO2 || 0);
  const pulse = Number(vitals.pulse || vitals.heartRate || 0);
  const temp = Number(vitals.temp || vitals.temperature || 0);

  if (bpSys > 160 || bpDia > 100) {
    anomalies.push(`Severe Hypertension (${bpSys}/${bpDia} mmHg)`);
  } else if (bpSys > 0 && bpSys < 90) {
    anomalies.push(`Hypotension (${bpSys}/${bpDia} mmHg)`);
  }

  if (spo2 > 0 && spo2 < 92) {
    anomalies.push(`Critical Hypoxia (${spo2}% SpO2)`);
  }

  if (pulse > 115) {
    anomalies.push(`Marked Tachycardia (${pulse} bpm)`);
  } else if (pulse > 0 && pulse < 50) {
    anomalies.push(`Bradycardia (${pulse} bpm)`);
  }

  if (temp > 101.5) {
    anomalies.push(`High Pyrexia (${temp}°F)`);
  }

  return {
    isCritical: anomalies.length > 0,
    anomalies,
    summary: anomalies.join(", "),
  };
}

/**
 * Initializes WebSocket Server on the provided HTTP Server
 * @param {import("node:http").Server} httpServer 
 * @returns {WebSocketServer}
 */
export function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/ws" || url.pathname === "/api/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, request) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const clientData = {
      id: clientId,
      ws,
      role: "staff",
      userId: null,
      userName: "Guest",
      branchId: null,
      subscribedPatientIds: new Set(),
      connectedAt: new Date().toISOString(),
    };
    clients.set(ws, clientData);

    // Send welcome handshake with active alerts
    sendToSocket(ws, {
      type: "SYNC_HANDSHAKE",
      payload: {
        clientId,
        message: "Connected to Cura-Tech Hospital Real-Time Clinical Event Bus",
        timestamp: new Date().toISOString(),
        recentAlerts: activeAlerts.slice(-10),
      },
    });

    ws.on("message", (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        handleIncomingMessage(ws, clientData, message, wss);
      } catch (err) {
        console.error("[WS] Error parsing message:", err.message);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", (err) => {
      console.error(`[WS] Client error (${clientId}):`, err.message);
      clients.delete(ws);
    });
  });

  return wss;
}

/**
 * Send JSON message safely to a WebSocket client
 */
export function sendToSocket(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Broadcast message to all connected clients or filtered by role/predicate
 */
export function broadcast(data, filterFn = null) {
  for (const [ws, client] of clients.entries()) {
    if (!filterFn || filterFn(client)) {
      sendToSocket(ws, data);
    }
  }
}

/**
 * Internal router for incoming WebSocket messages from clients
 */
export function handleIncomingMessage(ws, client, message, wss) {
  const { type, payload } = message;

  switch (type) {
    // 1. Role subscription & identity registration
    case "REGISTER_CLIENT": {
      client.role = payload.role || client.role;
      client.userId = payload.userId || client.userId;
      client.userName = payload.userName || client.userName;
      client.branchId = payload.branchId || client.branchId;

      sendToSocket(ws, {
        type: "CLIENT_REGISTERED",
        payload: {
          role: client.role,
          userId: client.userId,
          status: "authenticated",
          timestamp: new Date().toISOString(),
        },
      });
      break;
    }

    // 2. Vitals Recorded at Nursing Station
    case "NURSE_VITALS_RECORDED": {
      const { patientId, patientName, patientUhid, vitals, nurseName, doctorId, doctorName, bedNumber } = payload;
      const evaluation = evaluateVitalsAnomaly(vitals);

      const vitalsEntry = {
        id: `vit_${Date.now()}`,
        patientId,
        patientName,
        patientUhid,
        bedNumber: bedNumber || "General",
        vitals,
        nurseName: nurseName || client.userName || "Nursing Staff",
        timestamp: new Date().toISOString(),
        evaluation,
      };

      // Broadcast global patient update to everyone
      broadcast({
        type: "GLOBAL_PATIENT_UPDATED",
        payload: {
          patientId,
          type: "VITALS_UPDATE",
          vitalsEntry,
          timestamp: new Date().toISOString(),
        },
      });

      // If critical anomalies exist, trigger immediate targeted physician alert
      if (evaluation.isCritical) {
        const alert = {
          id: `alt_${Date.now()}`,
          severity: "CRITICAL",
          title: `⚠️ CRITICAL VITALS ALERT: ${patientName} (${bedNumber || "Bed Ward"})`,
          message: evaluation.summary,
          patientId,
          patientName,
          patientUhid,
          bedNumber,
          recordedBy: nurseName,
          targetDoctorId: doctorId || null,
          targetDoctorName: doctorName || null,
          vitals,
          timestamp: new Date().toISOString(),
        };

        activeAlerts.push(alert);
        if (activeAlerts.length > 50) activeAlerts.shift();

        // Broadcast alert targeting physicians and administrators
        broadcast(
          {
            type: "PHYSICIAN_CRITICAL_ALERT",
            payload: alert,
          },
          (c) => c.role === "doctor" || c.role === "superadmin" || c.role === "admin" || c.role === "nurse"
        );
      }
      break;
    }

    // 3. Medication Administered in Nursing MAR
    case "MEDICATION_ADMINISTERED": {
      const { patientId, patientName, patientUhid, medication, dose, route, nurseName, doctorId, requiresRefill } = payload;

      const medRecord = {
        id: `mar_${Date.now()}`,
        patientId,
        patientName,
        patientUhid,
        medication,
        dose,
        route: route || "Oral",
        administeredBy: nurseName || client.userName || "Nursing Staff",
        timestamp: new Date().toISOString(),
      };

      // 1. Broadcast global patient profile update (instantly updates EHR)
      broadcast({
        type: "GLOBAL_PATIENT_UPDATED",
        payload: {
          patientId,
          type: "MEDICATION_ADMINISTERED",
          medRecord,
          timestamp: new Date().toISOString(),
        },
      });

      // 2. Trigger notification to attending physician
      broadcast(
        {
          type: "PHYSICIAN_NOTIFICATION",
          payload: {
            title: `Medication Given: ${patientName}`,
            message: `${medication} (${dose}) administered by ${medRecord.administeredBy}.`,
            patientId,
            timestamp: new Date().toISOString(),
          },
        },
        (c) => c.role === "doctor" || c.role === "superadmin" || c.role === "admin"
      );

      // 3. Automatically initiate pharmacy request if replenishment needed
      if (requiresRefill) {
        broadcast(
          {
            type: "PHARMACY_REFILL_INITIATED",
            payload: {
              patientId,
              patientName,
              patientUhid,
              medication,
              quantityNeeded: 10,
              requestedBy: nurseName,
              timestamp: new Date().toISOString(),
            },
          },
          (c) => c.role === "pharmacist" || c.role === "staff_pharmacist" || c.role === "admin_pharmacist" || c.role === "admin"
        );
      }
      break;
    }

    // 4. Patient Status Change (e.g. Critical, Stable, Discharged)
    case "PATIENT_STATUS_CHANGED": {
      const { patientId, patientName, newStatus, updatedBy, notes } = payload;

      broadcast({
        type: "GLOBAL_PATIENT_UPDATED",
        payload: {
          patientId,
          type: "STATUS_CHANGE",
          newStatus,
          updatedBy: updatedBy || client.userName,
          notes,
          timestamp: new Date().toISOString(),
        },
      });

      // Notify doctors & administration
      broadcast(
        {
          type: "PHYSICIAN_NOTIFICATION",
          payload: {
            title: `Patient Status Change: ${patientName}`,
            message: `Status transitioned to '${newStatus}' by ${updatedBy || client.userName}.`,
            patientId,
            timestamp: new Date().toISOString(),
          },
        },
        (c) => c.role === "doctor" || c.role === "superadmin" || c.role === "admin" || c.role === "nurse"
      );
      break;
    }

    // 5. Automated Lab Request Initiated from Doctor or Nurse
    case "INITIATE_LAB_REQUEST": {
      const { patientId, patientName, patientUhid, testName, priority, doctorName } = payload;

      const labOrder = {
        id: `lab_ord_${Date.now()}`,
        patientId,
        patientName,
        patientUhid,
        testName,
        priority: priority || "Routine",
        orderedBy: doctorName || client.userName,
        status: "Pending Collection",
        timestamp: new Date().toISOString(),
      };

      // Notify diagnostic lab technicians immediately
      broadcast(
        {
          type: "LAB_ORDER_INITIATED",
          payload: labOrder,
        },
        (c) => c.role === "lab_tech" || c.role === "superadmin" || c.role === "admin"
      );

      // Also confirm back to initiator
      sendToSocket(ws, {
        type: "ORDER_CONFIRMED",
        payload: { orderId: labOrder.id, service: "Diagnostic Lab", testName },
      });
      break;
    }

    // 6. Automated Pharmacy Prescription Request
    case "INITIATE_PHARMACY_REQUEST": {
      const { patientId, patientName, patientUhid, medicines, doctorName } = payload;

      const pharmaOrder = {
        id: `rx_${Date.now()}`,
        patientId,
        patientName,
        patientUhid,
        medicines: medicines || [],
        prescribedBy: doctorName || client.userName,
        status: "Pending Dispense",
        timestamp: new Date().toISOString(),
      };

      // Notify pharmacists immediately
      broadcast(
        {
          type: "PHARMACY_REQUEST_INITIATED",
          payload: pharmaOrder,
        },
        (c) => c.role === "pharmacist" || c.role === "staff_pharmacist" || c.role === "admin_pharmacist" || c.role === "admin"
      );

      sendToSocket(ws, {
        type: "ORDER_CONFIRMED",
        payload: { orderId: pharmaOrder.id, service: "Central Pharmacy", itemCount: (medicines || []).length },
      });
      break;
    }

    // 7. Heartbeat Ping
    case "PING": {
      sendToSocket(ws, { type: "PONG", timestamp: new Date().toISOString() });
      break;
    }

    default: {
      console.warn(`[WS] Unrecognized message type: ${type}`);
    }
  }
}

/**
 * Returns summary of active connected clients
 */
export function getConnectedClientsSummary() {
  const summary = {
    total: clients.size,
    byRole: {},
    activeAlertsCount: activeAlerts.length,
  };

  for (const client of clients.values()) {
    summary.byRole[client.role] = (summary.byRole[client.role] || 0) + 1;
  }

  return summary;
}
