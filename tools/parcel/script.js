const OUTPUT_PATH = "./output/shortlist_polo.json";

const shortlistBody = document.getElementById("shortlist-body");
const emptyState = document.getElementById("empty-state");
const tableWrap = document.getElementById("table-wrap");
const summaryText = document.getElementById("summary-text");

function fmtNumber(value, digits = 2) {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function fmtCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function renderEmpty(message) {
  emptyState.hidden = false;
  tableWrap.hidden = true;
  summaryText.textContent = message;
}

function renderRows(rows) {
  shortlistBody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.title || row.name || "Untitled"}</td>
      <td>${row.location || row.city || "Unknown"}</td>
      <td>${fmtNumber(row.acres)}</td>
      <td>${fmtCurrency(row.price)}</td>
      <td>${fmtCurrency(row.price_per_acre)}</td>
      <td>${fmtNumber(row.score_total, 1)}</td>
      <td>${row.notes || row.investor_notes || "—"}</td>
    `;
    shortlistBody.appendChild(tr);
  });

  emptyState.hidden = true;
  tableWrap.hidden = false;
  summaryText.textContent = `${rows.length} property${rows.length === 1 ? "" : "ies"} shortlisted.`;
}

async function initParcel() {
  try {
    const response = await fetch(OUTPUT_PATH, { cache: "no-store" });
    if (!response.ok) {
      renderEmpty("Shortlist not generated yet.");
      return;
    }

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload?.shortlist;

    if (!Array.isArray(rows) || rows.length === 0) {
      renderEmpty("No shortlisted properties yet.");
      return;
    }

    renderRows(rows);
  } catch (error) {
    renderEmpty("Engine room under construction. Run the pipeline to generate shortlist data.");
  }
}

initParcel();
