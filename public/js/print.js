/**
 * Thermal 80mm Receipt & A4 Medical / Lab / Certificate / Report Print Engine
 */
import { getHospitalSettings } from "./db.js";
import { setPrintingState } from "./auth.js";
import { renderBarcodeSVG } from "./barcode.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function triggerPrint(html) {
  const root = document.getElementById("print-root");
  root.innerHTML = html;
  setPrintingState(true);
  await new Promise((r) => setTimeout(r, 90));
  try {
    window.print();
  } finally {
    setTimeout(() => setPrintingState(false), 800);
  }
}

export async function printThermalBill({ title, billNo, billDate, patientName, uhid, items, subTotal, gstAmount, discount, netTotal, paymentMode, cashier }) {
  const cfg = await getHospitalSettings();
  const rows = (items || []).map((it) => `
    <tr>
      <td>${escapeHtml(it.medName || it.desc)}</td>
      <td style="text-align:center;">${it.qty}</td>
      <td style="text-align:right;">${Number(it.amount || it.total || 0).toFixed(2)}</td>
    </tr>
  `).join("");

  await triggerPrint(`
    <div class="print-thermal">
      <div class="print-header">
        <div style="font-weight:700;font-size:14px;">${escapeHtml(cfg.hospitalName)}</div>
        <div>${escapeHtml(cfg.address)}</div>
        <div>Ph: ${escapeHtml(cfg.phone)} | GSTIN: ${escapeHtml(cfg.gstin)}</div>
        <div style="font-weight:700;margin-top:4px;">${escapeHtml(title)}</div>
      </div>
      <div>Bill No: <strong>${escapeHtml(billNo)}</strong> | Date: ${escapeHtml(billDate)}</div>
      <div>Patient: ${escapeHtml(patientName)} (${escapeHtml(uhid || "Walk-in")})</div>
      <table class="print-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Amt</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:right;">
        <div>SubTotal: ₹${Number(subTotal || 0).toFixed(2)}</div>
        ${gstAmount ? `<div>GST: ₹${Number(gstAmount).toFixed(2)}</div>` : ""}
        ${discount ? `<div>Discount: -₹${Number(discount).toFixed(2)}</div>` : ""}
        <div style="font-size:13px;font-weight:700;border-top:1px solid #000;padding-top:3px;">NET PAID: ₹${Number(netTotal || 0).toFixed(2)}</div>
        <div>Mode: ${escapeHtml(paymentMode || "Cash")}</div>
      </div>
      <div style="margin:8px 0;text-align:center;">${renderBarcodeSVG(billNo, 26)}</div>
      <div class="print-footer">
        <span>By: ${escapeHtml(cashier || "Staff")}</span>
        <span>${escapeHtml(cfg.receiptFooter)}</span>
      </div>
    </div>
  `);
}

export async function printA4Document({ docTitle, subtitle, metaPairs = [], bodyHtml, signatureLabel = "Authorized Signatory" }) {
  const cfg = await getHospitalSettings();
  const metaHtml = metaPairs.map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`).join("");

  await triggerPrint(`
    <div class="print-a4">
      <div class="print-header">
        <h2 style="margin:0;">${escapeHtml(cfg.hospitalName)}</h2>
        <div>${escapeHtml(cfg.address)} | Ph: ${escapeHtml(cfg.phone)}</div>
        <div style="font-size:12px;">GSTIN: ${escapeHtml(cfg.gstin)} | DL No: ${escapeHtml(cfg.drugLicenseNo)}</div>
        <h3 style="margin:8px 0 2px;text-transform:uppercase;">${escapeHtml(docTitle)}</h3>
        ${subtitle ? `<div style="font-size:12px;color:#444;">${escapeHtml(subtitle)}</div>` : ""}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;border:1px solid #ccc;padding:8px;">
        ${metaHtml}
      </div>
      <div>${bodyHtml}</div>
      <div class="print-footer" style="margin-top:36px;">
        <span>Printed: ${new Date().toLocaleString()}</span>
        <span><strong>${escapeHtml(signatureLabel)}</strong></span>
      </div>
    </div>
  `);
}
