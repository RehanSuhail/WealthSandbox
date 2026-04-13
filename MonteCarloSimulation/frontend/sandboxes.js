/* ================================================================
   sandboxes.js – Frontend logic for all 5 portfolio sandbox tabs
   ================================================================ */

const API = "http://localhost:8000";
const DEBOUNCE = 400;

// ── Helpers ──
const $ = (id) => document.getElementById(id);
const fmtC = (v) => "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtPct = (v) => `${Number(v).toFixed(1)}%`;
const fmtN = (v) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 1 });

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Shared Y-axis tick formatter
function yTickCurrency(v) {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

function makeChartOpts(xLabel) {
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "top", labels: { color: "#8b8fa3", usePointStyle: true, pointStyle: "circle", padding: 16, font: { size: 12 } } },
      tooltip: {
        backgroundColor: "#1a1d28", titleColor: "#e2e4ed", bodyColor: "#e2e4ed",
        borderColor: "#2e3145", borderWidth: 1, padding: 12,
        callbacks: { label: (c) => `${c.dataset.label}: ${fmtC(c.parsed.y)}` },
      },
    },
    scales: {
      x: { title: { display: true, text: xLabel, color: "#8b8fa3", font: { size: 13, weight: "600" } }, ticks: { color: "#8b8fa3" }, grid: { color: "rgba(46,49,69,0.5)" } },
      y: { title: { display: true, text: "Value ($)", color: "#8b8fa3", font: { size: 13, weight: "600" } }, ticks: { color: "#8b8fa3", callback: yTickCurrency }, grid: { color: "rgba(46,49,69,0.5)" } },
    },
  };
}

function ds(label, color, data = []) {
  return { label, data, borderColor: color, backgroundColor: color + "14", fill: false, tension: 0.3, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 };
}

// ── Crisis metadata ──
const CRISIS_META = {
  "GreatDepression": { label: "Great Depression",     years: 5 },
  "OilCrisis1973":   { label: "1973 Oil Crisis",      years: 4 },
  "DotCom2000":      { label: "Dot-Com Bubble",       years: 4 },
  "Financial2008":   { label: "2008 Financial Crisis", years: 4 },
  "Covid2020":       { label: "COVID-19 Crash",        years: 2 },
  "RateShock2022":   { label: "2022 Rate Shock",       years: 2 },
};

// ── Generic Crisis Band Chart Plugin ──
// Draws a red translucent band on any chart that has _crisisWindow set.
// _crisisWindow = { event, start_year, end_year }
// The chart labels must be strings (years or ages or months).
const crisisBandPlugin = {
  id: "sandboxCrisisBand",
  beforeDraw(chart) {
    const cw = chart._crisisWindow;
    if (!cw) return;

    const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
    const labels = chart.data.labels;

    // For year/age-based charts: labels are "0","1",... or "30","31",...
    // start_year / end_year are offsets from the first label
    const firstLabel = Number(labels[0]);
    const startLabel = String(firstLabel + cw.start_year);
    const endLabel = String(firstLabel + cw.end_year);

    const startIdx = labels.indexOf(startLabel);
    let endIdx = labels.indexOf(endLabel);
    if (startIdx === -1) return;
    if (endIdx === -1) endIdx = labels.length - 1;

    const xStart = x.getPixelForValue(startIdx);
    const xEnd = x.getPixelForValue(endIdx);

    ctx.save();

    // Red translucent band
    ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
    ctx.fillRect(xStart, top, xEnd - xStart, bottom - top);

    // Left edge dashed line
    ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(xStart, top);
    ctx.lineTo(xStart, bottom);
    ctx.stroke();

    // Label
    ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
    ctx.font = "bold 10px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`\u26A1 ${cw.event}`, xStart + 4, top + 14);

    ctx.restore();
  },
};
Chart.register(crisisBandPlugin);

// ── Retirement Phase Divider Plugin ──
const retirementDividerPlugin = {
  id: "retirementDivider",
  _retirementAge: null,
  beforeDraw(chart) {
    const age = retirementDividerPlugin._retirementAge;
    if (age == null) return;
    // Only apply to the retirement chart
    if (chart.canvas.id !== "ret-chart") return;

    const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
    const labels = chart.data.labels;
    const idx = labels.indexOf(String(age));
    if (idx === -1) return;

    const xPos = x.getPixelForValue(idx);

    ctx.save();

    // Left shade – Accumulation phase
    ctx.fillStyle = "rgba(34, 197, 94, 0.04)";
    ctx.fillRect(left, top, xPos - left, bottom - top);

    // Right shade – Drawdown phase
    ctx.fillStyle = "rgba(239, 68, 68, 0.04)";
    ctx.fillRect(xPos, top, right - xPos, bottom - top);

    // Vertical dashed line
    ctx.strokeStyle = "rgba(168, 162, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(xPos, top);
    ctx.lineTo(xPos, bottom);
    ctx.stroke();

    // Phase labels
    ctx.font = "bold 11px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";

    // "Accumulation" label – left of line
    ctx.fillStyle = "rgba(34, 197, 94, 0.75)";
    const accCenter = left + (xPos - left) / 2;
    ctx.fillText("\u2B06 ACCUMULATION", accCenter, top + 16);

    // "Drawdown" label – right of line
    ctx.fillStyle = "rgba(239, 68, 68, 0.75)";
    const ddCenter = xPos + (right - xPos) / 2;
    ctx.fillText("\u2B07 DRAWDOWN", ddCenter, top + 16);

    // Age label at the divider
    ctx.fillStyle = "rgba(168, 162, 255, 0.85)";
    ctx.font = "bold 10px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Retire @ ${age}`, xPos + 4, top + 30);

    ctx.restore();
  },
};
Chart.register(retirementDividerPlugin);

// ── Tab switching ──
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".sandbox-panel");

tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ================================================================
//  1. RETIREMENT
// ================================================================
const retChart = new Chart($("ret-chart").getContext("2d"), {
  type: "line",
  data: { labels: [], datasets: [ds("Worst (P10)", "#ef4444"), ds("Base (P50)", "#3b82f6"), ds("Best (P90)", "#22c55e")] },
  options: makeChartOpts("Age"),
});

function retPayload() {
  return {
    current_age: +$("ret-currentAge").value,
    retirement_age: +$("ret-retirementAge").value,
    life_expectancy: +$("ret-lifeExpectancy").value,
    current_savings: +$("ret-currentSavings").value,
    monthly_contrib: +$("ret-monthlyContrib").value,
    expected_return: +$("ret-expectedReturn").value / 100,
    volatility: +$("ret-volatility").value / 100,
    inflation_rate: +$("ret-inflationRate").value / 100,
    employer_match_pct: +$("ret-employerMatch").value,
    expected_monthly_income: +$("ret-monthlyIncome").value,
    ss_start_age: +$("ret-ssStartAge").value,
    ss_monthly_amount: +$("ret-ssAmount").value,
    crisis_event: $("ret-crisisEvent").value,
    crisis_start_year: +$("ret-crisisStart").value,
  };
}

function retDisplay() {
  $("ret-currentAge-val").textContent = $("ret-currentAge").value;
  $("ret-retirementAge-val").textContent = $("ret-retirementAge").value;
  $("ret-lifeExpectancy-val").textContent = $("ret-lifeExpectancy").value;
  $("ret-currentSavings-val").textContent = fmtC($("ret-currentSavings").value);
  $("ret-monthlyContrib-val").textContent = fmtC($("ret-monthlyContrib").value);
  $("ret-expectedReturn-val").textContent = fmtPct($("ret-expectedReturn").value);
  $("ret-volatility-val").textContent = fmtPct($("ret-volatility").value);
  $("ret-inflationRate-val").textContent = fmtPct($("ret-inflationRate").value);
  $("ret-employerMatch-val").textContent = `${$("ret-employerMatch").value}%`;
  $("ret-monthlyIncome-val").textContent = fmtC($("ret-monthlyIncome").value);
  $("ret-ssStartAge-val").textContent = $("ret-ssStartAge").value;
  $("ret-ssAmount-val").textContent = fmtC($("ret-ssAmount").value);
  $("ret-crisisStart-val").textContent = `${$("ret-crisisStart").value} yrs`;
}

let retAbort = null;
async function runRetirement() {
  if (retAbort) retAbort.abort(); retAbort = new AbortController();
  retDisplay();
  $("ret-status").textContent = "Running simulation…";
  try {
    const r = await fetch(`${API}/api/simulate/retirement`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(retPayload()), signal: retAbort.signal });
    if (!r.ok) throw new Error((await r.json()).detail || r.status);
    const d = await r.json();
    $("ret-m-balance").textContent = fmtC(d.metrics.balance_at_retirement);
    $("ret-m-prob").textContent = fmtPct(d.metrics.probability_of_success);
    retChart.data.labels = d.ages.map(String);
    retChart.data.datasets[0].data = d.paths.p10_worst_case;
    retChart.data.datasets[1].data = d.paths.p50_base_case;
    retChart.data.datasets[2].data = d.paths.p90_best_case;
    retirementDividerPlugin._retirementAge = +$("ret-retirementAge").value;
    retChart._crisisWindow = d.crisis_window || null;
    retChart.update("none");
    $("ret-status").textContent = "✓ Simulation complete";
  } catch (e) { if (e.name !== "AbortError") $("ret-status").textContent = `⚠ ${e.message}`; }
}

const dRetirement = debounce(runRetirement, DEBOUNCE);
document.querySelectorAll("#panel-retirement input, #panel-retirement select").forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { retDisplay(); dRetirement(); }));
runRetirement();

// ================================================================
//  2. EQUITY GROWTH
// ================================================================
const eqChart = new Chart($("eq-chart").getContext("2d"), {
  type: "line",
  data: { labels: [], datasets: [ds("Worst (P10)", "#ef4444"), ds("Base (P50)", "#3b82f6"), ds("Best (P90)", "#22c55e")] },
  options: makeChartOpts("Year"),
});

function eqPayload() {
  return {
    initial_lump_sum: +$("eq-lumpSum").value,
    monthly_dca: +$("eq-monthlyDca").value,
    time_horizon_years: +$("eq-horizon").value,
    expected_return: +$("eq-return").value / 100,
    volatility: +$("eq-vol").value / 100,
    expense_ratio: +$("eq-expense").value / 100,
    crisis_event: $("eq-crisisEvent").value,
    crisis_start_year: +$("eq-crisisStart").value,
  };
}

function eqDisplay() {
  $("eq-lumpSum-val").textContent = fmtC($("eq-lumpSum").value);
  $("eq-monthlyDca-val").textContent = fmtC($("eq-monthlyDca").value);
  $("eq-horizon-val").textContent = $("eq-horizon").value;
  $("eq-return-val").textContent = fmtPct($("eq-return").value);
  $("eq-vol-val").textContent = fmtPct($("eq-vol").value);
  $("eq-expense-val").textContent = `${parseFloat($("eq-expense").value).toFixed(2)}%`;
  $("eq-crisisStart-val").textContent = `${$("eq-crisisStart").value} yrs`;
}

let eqAbort = null;
async function runEquity() {
  if (eqAbort) eqAbort.abort(); eqAbort = new AbortController();
  eqDisplay();
  $("eq-status").textContent = "Running simulation…";
  try {
    const r = await fetch(`${API}/api/simulate/equity`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eqPayload()), signal: eqAbort.signal });
    if (!r.ok) throw new Error((await r.json()).detail || r.status);
    const d = await r.json();
    $("eq-m-contributed").textContent = fmtC(d.metrics.total_contributed);
    $("eq-m-projected").textContent = fmtC(d.metrics.projected_value);
    $("eq-m-cagr").textContent = fmtPct(d.metrics.cagr_pct);
    $("eq-m-drag").textContent = fmtC(d.metrics.expense_drag);
    eqChart.data.labels = d.years.map(String);
    eqChart.data.datasets[0].data = d.paths.p10_worst_case;
    eqChart.data.datasets[1].data = d.paths.p50_base_case;
    eqChart.data.datasets[2].data = d.paths.p90_best_case;
    eqChart._crisisWindow = d.crisis_window || null;
    eqChart.update("none");
    $("eq-status").textContent = "✓ Simulation complete";
  } catch (e) { if (e.name !== "AbortError") $("eq-status").textContent = `⚠ ${e.message}`; }
}

const dEquity = debounce(runEquity, DEBOUNCE);
document.querySelectorAll("#panel-equity input, #panel-equity select").forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { eqDisplay(); dEquity(); }));
runEquity();

// ================================================================
//  3. COLLEGE SAVINGS
// ================================================================
const colChart = new Chart($("col-chart").getContext("2d"), {
  type: "line",
  data: { labels: [], datasets: [ds("Worst (P10)", "#ef4444"), ds("Base (P50)", "#3b82f6"), ds("Best (P90)", "#22c55e")] },
  options: makeChartOpts("Child's Age"),
});

function colPayload() {
  return {
    child_age: +$("col-childAge").value,
    target_start_age: +$("col-startAge").value,
    target_cost: +$("col-targetCost").value,
    current_balance: +$("col-balance").value,
    monthly_contrib: +$("col-monthly").value,
    expected_return: +$("col-return").value / 100,
    volatility: +$("col-vol").value / 100,
    crisis_event: $("col-crisisEvent").value,
    crisis_start_year: +$("col-crisisStart").value,
  };
}

function colDisplay() {
  $("col-childAge-val").textContent = $("col-childAge").value;
  $("col-startAge-val").textContent = $("col-startAge").value;
  $("col-targetCost-val").textContent = fmtC($("col-targetCost").value);
  $("col-balance-val").textContent = fmtC($("col-balance").value);
  $("col-monthly-val").textContent = fmtC($("col-monthly").value);
  $("col-return-val").textContent = fmtPct($("col-return").value);
  $("col-vol-val").textContent = fmtPct($("col-vol").value);
  $("col-crisisStart-val").textContent = `${$("col-crisisStart").value} yrs`;
}

let colAbort = null;
async function runCollege() {
  if (colAbort) colAbort.abort(); colAbort = new AbortController();
  colDisplay();
  $("col-status").textContent = "Running simulation…";
  try {
    const r = await fetch(`${API}/api/simulate/college`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(colPayload()), signal: colAbort.signal });
    if (!r.ok) throw new Error((await r.json()).detail || r.status);
    const d = await r.json();
    $("col-m-contributed").textContent = fmtC(d.metrics.total_contributed);
    $("col-m-projected").textContent = fmtC(d.metrics.projected_base_case);
    $("col-m-gap").textContent = fmtC(d.metrics.gap_to_target);
    $("col-m-prob").textContent = fmtPct(d.goal_probability);
    colChart.data.labels = d.ages.map(String);
    colChart.data.datasets[0].data = d.paths.p10_worst_case;
    colChart.data.datasets[1].data = d.paths.p50_base_case;
    colChart.data.datasets[2].data = d.paths.p90_best_case;
    colChart._crisisWindow = d.crisis_window || null;
    colChart.update("none");
    $("col-status").textContent = "✓ Simulation complete";
  } catch (e) { if (e.name !== "AbortError") $("col-status").textContent = `⚠ ${e.message}`; }
}

const dCollege = debounce(runCollege, DEBOUNCE);
document.querySelectorAll("#panel-college input, #panel-college select").forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { colDisplay(); dCollege(); }));
runCollege();

// ================================================================
//  4. REAL ESTATE
// ================================================================
const reChart = new Chart($("re-chart").getContext("2d"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      ds("Property Value", "#22c55e"),
      ds("Loan Balance", "#ef4444"),
      ds("Equity", "#3b82f6"),
      { ...ds("Cumulative Cash Flow", "#facc15"), borderDash: [6, 3] },
    ],
  },
  options: makeChartOpts("Year"),
});

function rePayload() {
  return {
    purchase_price: +$("re-price").value,
    down_payment_pct: +$("re-downPct").value / 100,
    interest_rate: +$("re-rate").value / 100,
    monthly_rent: +$("re-rent").value,
    annual_appreciation: +$("re-appreciation").value / 100,
    vacancy_rate: +$("re-vacancy").value / 100,
    annual_expenses: +$("re-expenses").value,
    hold_period_years: +$("re-hold").value,
    crisis_event: $("re-crisisEvent").value,
    crisis_start_year: +$("re-crisisStart").value,
  };
}

function reDisplay() {
  $("re-price-val").textContent = fmtC($("re-price").value);
  $("re-downPct-val").textContent = fmtPct($("re-downPct").value);
  $("re-rate-val").textContent = `${parseFloat($("re-rate").value).toFixed(2)}%`;
  $("re-rent-val").textContent = fmtC($("re-rent").value);
  $("re-appreciation-val").textContent = fmtPct($("re-appreciation").value);
  $("re-vacancy-val").textContent = `${$("re-vacancy").value}%`;
  $("re-expenses-val").textContent = fmtC($("re-expenses").value);
  $("re-hold-val").textContent = $("re-hold").value;
  $("re-crisisStart-val").textContent = `${$("re-crisisStart").value} yrs`;
}

let reAbort = null;
async function runRealEstate() {
  if (reAbort) reAbort.abort(); reAbort = new AbortController();
  reDisplay();
  $("re-status").textContent = "Running simulation…";
  try {
    const r = await fetch(`${API}/api/simulate/real-estate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rePayload()), signal: reAbort.signal });
    if (!r.ok) throw new Error((await r.json()).detail || r.status);
    const d = await r.json();
    const m = d.metrics;
    $("re-m-cashflow").textContent = fmtC(m.monthly_cash_flow);
    $("re-m-cap").textContent = fmtPct(m.cap_rate);
    $("re-m-coc").textContent = fmtPct(m.cash_on_cash_return);
    $("re-m-profit").textContent = fmtC(m.total_profit);
    reChart.data.labels = d.years.map(String);
    reChart.data.datasets[0].data = d.property_value;
    reChart.data.datasets[1].data = d.loan_balance;
    reChart.data.datasets[2].data = d.equity;
    reChart.data.datasets[3].data = d.cumulative_cash_flow;
    reChart._crisisWindow = d.crisis_window || null;
    reChart.update("none");
    $("re-status").textContent = "✓ Analysis complete";
  } catch (e) { if (e.name !== "AbortError") $("re-status").textContent = `⚠ ${e.message}`; }
}

const dRealEstate = debounce(runRealEstate, DEBOUNCE);
document.querySelectorAll("#panel-realestate input, #panel-realestate select").forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { reDisplay(); dRealEstate(); }));
runRealEstate();

// ================================================================
//  5. EMERGENCY FUND
// ================================================================
const emChart = new Chart($("em-chart").getContext("2d"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      ds("Nominal Balance", "#3b82f6"),
      ds("Real Purchasing Power", "#22c55e"),
      { ...ds("Target Safety Net", "#ef4444"), borderDash: [8, 4], pointRadius: 0 },
    ],
  },
  options: makeChartOpts("Month"),
});

function emPayload() {
  return {
    monthly_expenses: +$("em-expenses").value,
    target_buffer_months: +$("em-buffer").value,
    current_savings: +$("em-savings").value,
    monthly_addition: +$("em-addition").value,
    hysa_yield_rate: +$("em-yield").value / 100,
    inflation_rate: +$("em-inflation").value / 100,
  };
}

function emDisplay() {
  $("em-expenses-val").textContent = fmtC($("em-expenses").value);
  $("em-buffer-val").textContent = $("em-buffer").value;
  $("em-savings-val").textContent = fmtC($("em-savings").value);
  $("em-addition-val").textContent = fmtC($("em-addition").value);
  $("em-yield-val").textContent = `${parseFloat($("em-yield").value).toFixed(2)}%`;
  $("em-inflation-val").textContent = fmtPct($("em-inflation").value);
}

let emAbort = null;
async function runEmergency() {
  if (emAbort) emAbort.abort(); emAbort = new AbortController();
  emDisplay();
  $("em-status").textContent = "Running simulation…";
  try {
    const r = await fetch(`${API}/api/simulate/emergency`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(emPayload()), signal: emAbort.signal });
    if (!r.ok) throw new Error((await r.json()).detail || r.status);
    const d = await r.json();
    const m = d.metrics;
    $("em-m-target").textContent = fmtC(m.target_safety_net);
    $("em-m-covered").textContent = fmtN(m.current_months_covered);
    $("em-m-months").textContent = m.months_to_target === "60+" ? "60+" : m.months_to_target;
    $("em-m-yield").textContent = `${fmtN(m.net_real_yield_pct)}%`;
    emChart.data.labels = d.months.map(String);
    emChart.data.datasets[0].data = d.fund_balance;
    emChart.data.datasets[1].data = d.real_purchasing_power;
    emChart.data.datasets[2].data = d.target_line;
    emChart.update("none");
    $("em-status").textContent = "✓ Projection complete";
  } catch (e) { if (e.name !== "AbortError") $("em-status").textContent = `⚠ ${e.message}`; }
}

const dEmergency = debounce(runEmergency, DEBOUNCE);
document.querySelectorAll("#panel-emergency input").forEach((el) => el.addEventListener("input", () => { emDisplay(); dEmergency(); }));
runEmergency();
