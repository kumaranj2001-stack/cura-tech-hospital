/**
 * Unique Hospital Identifier (UHID) & Digital Health Identifier Generator
 * Formats: CURA-YYYY-XXXX (e.g. CURA-2026-0104)
 */

export function generateUhid(counter: number = 1001): string {
  const year = new Date().getFullYear();
  const padded = String(counter).padStart(4, "0");
  return `CURA-${year}-${padded}`;
}

export function formatTokenNumber(num: number): string {
  return `T-${String(num).padStart(3, "0")}`;
}

/**
 * Returns a crisp QR Code Data/Image URL using reliable vector/image rendering
 */
export function getPatientQrUrl(uhid: string, name: string, phone: string): string {
  const payload = JSON.stringify({
    hospital: "Cura Hospital",
    uhid,
    name,
    phone,
    issued: new Date().toISOString().slice(0, 10),
  });
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(payload)}`;
}

export function getPrescriptionQrUrl(rxId: string, doctorName: string, uhid: string): string {
  const payload = JSON.stringify({
    type: "e-Prescription",
    id: rxId,
    doctor: doctorName,
    uhid,
    verified: true,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(payload)}`;
}

export function getLabReportQrUrl(orderNumber: string, patientUhid: string): string {
  const payload = JSON.stringify({
    type: "DiagnosticLabReport",
    order: orderNumber,
    uhid: patientUhid,
    authenticated: true,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(payload)}`;
}
