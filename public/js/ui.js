/**
 * Reusable UI Primitives, Ribbon Renderer, Data Tables, Modals, Toasts & CSV Export
 */
import { printA4Document } from "./print.js";

export function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatOperationalDate(date = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(date.getDate()).padStart(2, "0");
  const mmm = months[date.getMonth()];
  const yyyy = date.getFullYear();
  return `${dd}/${mmm}/${yyyy}`;
}

export function money(val) {
  return `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toast(message, type = "info") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.25s ease";
    setTimeout(() => el.remove(), 260);
  }, 3200);
}

export function openModal({ title, bodyHtml, width = "720px", onMount }) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-box" style="max-width:${width}">
      <div class="modal-head">
        <h3>${esc(title)}</h3>
        <button type="button" class="btn btn-sm" id="modal-close-btn">✕</button>
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
  if (!root) return;
  root.classList.add("hidden");
  root.innerHTML = "";
}

export function exportCSV(filename, headers, rows) {
  const escapeCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escapeCsv).join(",")];
  rows.forEach((row) => lines.push(row.map(escapeCsv).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Interactive Searchable Data Table + CSV Export + Print Helper
 */
export function mountDataTable(container, {
  columns,
  rows,
  searchPlaceholder = "Search records...",
  emptyText = "No records found.",
  exportFileName = "",
  printTitle = "",
  extraToolbarHtml = ""
}) {
  let query = "";
  const idPrefix = `tbl_${Math.random().toString(36).slice(2, 8)}`;

  const render = () => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? rows
      : rows.filter((r) =>
          columns.some((c) => {
            const raw = typeof c.value === "function" ? c.value(r) : r[c.key];
            return String(raw ?? "").toLowerCase().includes(q);
          })
        );

    container.innerHTML = `
      <div class="table-toolbar">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input id="${idPrefix}_q" class="search-input" type="search" value="${esc(query)}" placeholder="${esc(searchPlaceholder)}" />
          <span class="badge">${filtered.length} record${filtered.length === 1 ? "" : "s"}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${extraToolbarHtml}
          ${exportFileName ? `<button type="button" class="btn btn-sm" id="${idPrefix}_csv">Export CSV</button>` : ""}
          ${printTitle ? `<button type="button" class="btn btn-sm" id="${idPrefix}_prt">Print / PDF</button>` : ""}
        </div>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>${columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${filtered.length === 0
              ? `<tr><td colspan="${columns.length}" style="text-align:center;color:var(--text-muted);padding:18px;">${esc(emptyText)}</td></tr>`
              : filtered.map((r, idx) => `
                <tr data-row-idx="${idx}">
                  ${columns.map((c) => `<td>${c.render ? c.render(r) : esc(r[c.key] ?? "")}</td>`).join("")}
                </tr>`).join("")
            }
          </tbody>
        </table>
      </div>
    `;

    const input = container.querySelector(`#${idPrefix}_q`);
    input.oninput = (e) => {
      query = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const nextInput = container.querySelector(`#${idPrefix}_q`);
      nextInput.focus();
      nextInput.setSelectionRange(pos, pos);
    };

    if (exportFileName) {
      container.querySelector(`#${idPrefix}_csv`).onclick = () => {
        const plainCols = columns.filter((c) => !c.noExport);
        exportCSV(
          exportFileName,
          plainCols.map((c) => c.label),
          filtered.map((r) => plainCols.map((c) => (typeof c.value === "function" ? c.value(r) : r[c.key] ?? "")))
        );
      };
    }

    if (printTitle) {
      container.querySelector(`#${idPrefix}_prt`).onclick = () => {
        const plainCols = columns.filter((c) => !c.noExport);
        const bodyHtml = `
          <table class="print-table">
            <thead><tr>${plainCols.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead>
            <tbody>
              ${filtered.map((r) => `<tr>${plainCols.map((c) => `<td>${esc(typeof c.value === "function" ? c.value(r) : r[c.key] ?? "")}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        `;
        printA4Document({
          docTitle: printTitle,
          metaPairs: [["Generated Date", new Date().toLocaleString()], ["Total Rows", filtered.length]],
          bodyHtml
        });
      };
    }
  };

  render();
}

/** Crisp SVG Ribbon Icons by semantic type */
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
