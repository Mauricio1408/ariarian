// Table export — the privileged action Permission denied gates.
// Formats follow the Figma Export overlay (1601:5761): Excel, CSV, PDF.

export type ExportFormat = "excel" | "csv" | "pdf";
type Cell = string | number;

const esc = (v: Cell) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const html = (v: Cell) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function table(header: string[], rows: Cell[][]) {
  return `<table><thead><tr>${header.map((h) => `<th>${html(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${html(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

export function exportTable(base: string, header: string[], rows: Cell[][], format: ExportFormat) {
  const name = base.replace(/\.(csv|xls|pdf)$/i, "");
  if (format === "csv") {
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
  } else if (format === "excel") {
    const doc = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${table(header, rows)}</body></html>`;
    download(new Blob([doc], { type: "application/vnd.ms-excel" }), `${name}.xls`);
  } else {
    const w = window.open("", "_blank", "width=1000,height=760");
    if (!w) return false;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${html(name)}</title><style>
      body{font:12px/1.4 system-ui,sans-serif;color:#061111;margin:32px}h1{font-size:18px;margin:0 0 4px}p{color:#5a6a75;margin:0 0 16px}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #c9d1d7;padding:6px 8px;text-align:left}th{background:#f7f9fa}
    </style></head><body><h1>DOST AriArian — ${html(name.replace(/-/g, " "))}</h1><p>${rows.length} rows · generated March 14, 2026</p>${table(header, rows)}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
  }
  return true;
}

/** Back-compat: CSV download. */
export function downloadCsv(filename: string, header: string[], rows: Cell[][]) {
  exportTable(filename, header, rows, "csv");
}
