/**
 * Shared UI Helpers: Escaping, Toasts, Modals, Searchable Data Tables, CSV Export & Ribbon Icons
 */
import { printA4Document } from "./print.js";

export function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatOperationalDate(dateObj = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mmm = months[dateObj.getMonth()];
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mmm}/${yyyy}`;
}

export function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toast(message, type = "info") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

export function openModal({ title, bodyHtml, width = "640px", onMount }) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-box" style="max-width:${width};">
      <div class="modal-head">
        <h3>${esc(title)}</h3>
        <button type="button" class="header-icon-btn" id="modal-close-btn">Close</button>
      </div>
      <div class="modal-body" id="modal-body-slot">${bodyHtml}</div>
    </div>
  `;
  root.classList.remove("hidden");
  root.querySelector("#modal-close-btn").onclick = closeModal;
  root.onclick = (e) => {
    if (e.target === root) closeModal();
  };
  if (typeof onMount === "function") onMount(root.querySelector("#modal-body-slot"));
}

export function closeModal() {
  const root = document.getElementById("modal-root");
  root.classList.add("hidden");
  root.innerHTML = "";
}

export function exportRowsToCsv(filename, columns, rows) {
  const header = columns.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => {
      const val = typeof c.exportValue === "function" ? c.exportValue(row) : row[c.key];
      return `"${String(val ?? "").replace(/"/g, '""')}"`;
    }).join(",")
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Renders a searchable, CSV-exportable & A4-printable table inside a target container.
 */
export function mountDataTable(container, { columns, rows, searchPlaceholder = "Search records...", exportFileName, printTitle, emptyText = "No records found." }) {
  let query = "";

  const render = () => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
      : rows;

    const headCells = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
    const bodyRows = filtered.length
      ? filtered.map((r) => {
          const cells = columns.map((c) => {
            if (typeof c.render === "function") return `<td>${c.render(r)}</td>`;
            return `<td>${esc(r[c.key] ?? "")}</td>`;
          }).join("");
          return `<tr>${cells}</tr>`;
        }).join("")
      : `<tr><td colspan="${columns.length}" style="text-align:center;color:var(--text-muted);padding:18px;">${esc(emptyText)}</td></tr>`;

    const tbl = container.querySelector(".table-wrap");
    if (tbl) {
      tbl.innerHTML = `<table class="data-table"><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    }
    const cnt = container.querySelector(".tbl-count");
    if (cnt) cnt.textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;
  };

  container.innerHTML = `
    <div class="table-toolbar">
      <input type="search" class="table-search" placeholder="${esc(searchPlaceholder)}" />
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="tbl-count" style="font-size:11.5px;color:var(--text-muted);"></span>
        ${exportFileName ? `<button type="button" class="btn btn-sm" data-tbl-csv>Export CSV</button>` : ""}
        ${printTitle ? `<button type="button" class="btn btn-sm" data-tbl-print>Print A4</button>` : ""}
      </div>
    </div>
    <div class="table-wrap"></div>
  `;

  container.querySelector(".table-search").oninput = (e) => {
    query = e.target.value;
    render();
  };

  const csvBtn = container.querySelector("[data-tbl-csv]");
  if (csvBtn) {
    csvBtn.onclick = () => {
      const q = query.trim().toLowerCase();
      const filtered = q ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q)) : rows;
      exportRowsToCsv(exportFileName, columns.filter((c) => !c.noExport), filtered);
    };
  }

  const printBtn = container.querySelector("[data-tbl-print]");
  if (printBtn) {
    printBtn.onclick = () => {
      const q = query.trim().toLowerCase();
      const filtered = q ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q)) : rows;
      const exportCols = columns.filter((c) => !c.noExport);
      const html = `
        <table class="print-table">
          <thead><tr>${exportCols.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead>
          <tbody>
            ${filtered.map((r) => `<tr>${exportCols.map((c) => `<td>${esc(typeof c.exportValue === "function" ? c.exportValue(r) : r[c.key] ?? "")}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      `;
      printA4Document({ docTitle: printTitle, metaPairs: [["Total Records", filtered.length], ["Date", todayISO()]], bodyHtml: html });
    };
  }

  render();
}

const ICON_COLORS = {
  blue: "#1d6fe2",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  teal: "#0d9488",
  purple: "#7c3aed",
  slate: "#475569"
};

export function getRibbonIconSvg(icon = "doc", tone = "blue") {
  const c = ICON_COLORS[tone] || ICON_COLORS.blue;
  switch (icon) {
    case "dashboard":
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" fill="${c}"/><rect x="13" y="3" width="8" height="5" rx="1.5" fill="#16a34a"/><rect x="13" y="10" width="8" height="11" rx="1.5" fill="${c}" opacity="0.8"/><rect x="3" y="13" width="8" height="8" rx="1.5" fill="#f59e0b"/></svg>`;
    case "user-add":
      return `<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="4" fill="${c}"/><path d="M2 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" fill="${c}" opacity="0.35"/><path d="M19 8v6M16 11h6" stroke="#16a34a" stroke-width="2.4" stroke-linecap="round"/></svg>`;
    case "users":
      return `<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" fill="${c}"/><circle cx="16.5" cy="9.5" r="2.8" fill="${c}" opacity="0.6"/><path d="M2.5 19.5c0-3 2.9-5 6.5-5s6.5 2 6.5 5M14 19.5c0-2.2 1.8-3.8 4.2-3.8 1.8 0 3.3 1 3.8 2.8" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    case "doctor":
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" fill="${c}" opacity="0.16" stroke="${c}" stroke-width="1.6"/><path d="M12 7v10M7 12h10" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    case "lab":
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M9 3h6M10 3v5.5L5.2 17.8A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.8-2.7L14 8.5V3" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 15.5h10" stroke="#16a34a" stroke-width="2"/></svg>`;
    case "pharmacy":
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2.5" fill="${c}" opacity="0.15" stroke="${c}" stroke-width="1.7"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="${c}" stroke-width="1.7"/><path d="M12 10v6M9 13h6" stroke="#16a34a" stroke-width="2.2" stroke-linecap="round"/></svg>`;
    case "cash":
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5.5" width="19" height="13" rx="2" fill="#dcfce7" stroke="#16a34a" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="#16a34a"/></svg>`;
    case "bed":
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M3 18V8m0 6h18v4M3 11h7a3 3 0 0 1 3 3v0h8v-2a3 3 0 0 0-3-3h-5" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case "report":
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h9l4 4v14H6V3z" fill="#ffffff" stroke="${c}" stroke-width="1.7"/><path d="M9 16v-4m3 4V9m3 7v-2" stroke="#16a34a" stroke-width="2" stroke-linecap="round"/></svg>`;
    case "gear":
      return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.5" stroke="${c}" stroke-width="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    case "sms":
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4V5z" fill="${c}" opacity="0.16" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 9.5h8M8 12.5h5" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    case "alert":
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3L2.5 20h19L12 3z" fill="#fef3c7" stroke="#d97706" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v5m0 3h.01" stroke="#b45309" stroke-width="2" stroke-linecap="round"/></svg>`;
    case "lock":
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" fill="#fee2e2" stroke="#dc2626" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#dc2626" stroke-width="1.8"/></svg>`;
    case "truck":
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="13" height="11" rx="1.5" fill="${c}" opacity="0.16" stroke="${c}" stroke-width="1.7"/><path d="M15 9h4l3 3v5h-7V9z" stroke="${c}" stroke-width="1.7"/><circle cx="7" cy="18" r="2" fill="${c}"/><circle cx="18" cy="18" r="2" fill="${c}"/></svg>`;
    case "cert":
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" fill="#fffbeb" stroke="#d97706" stroke-width="1.7"/><circle cx="12" cy="11" r="3" stroke="#d97706" stroke-width="1.6"/><path d="M8 17h8" stroke="#92400e" stroke-width="1.7" stroke-linecap="round"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" fill="${c}" opacity="0.14" stroke="${c}" stroke-width="1.7"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" stroke="${c}" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  }
}
