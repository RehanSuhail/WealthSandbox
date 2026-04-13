// ── Configuration ──
const API_BASE = "http://localhost:8000";
const DEBOUNCE_MS = 400;

// ── Crisis metadata (mirrors backend CRISES dict) ──
const CRISIS_META = {
  "GreatDepression": { label: "Great Depression",     years: 5, desc: "Devastating 5-year downturn: −43% in Year 3, partial recovery by Year 5 (+54%)." },
  "OilCrisis1973":   { label: "1973 Oil Crisis",      years: 4, desc: "Oil embargo triggered −15% and −26% drops, then strong 2-year recovery." },
  "DotCom2000":      { label: "Dot-Com Bubble",       years: 4, desc: "Three consecutive years of losses (2000–02), solid +28% bounce in Year 4." },
  "Financial2008":   { label: "2008 Financial Crisis", years: 4, desc: "S&P 500 fell 37% in Year 1, slow 3-year recovery." },
  "Covid2020":       { label: "COVID-19 Crash",        years: 2, desc: "Sharp 34% drop followed by a massive 68% rebound." },
  "RateShock2022":   { label: "2022 Rate Shock",       years: 2, desc: "Fed rate hikes drove a 19% decline, followed by a 24% recovery." },
};

// ── DOM References ──
const sliders = {
  currentAge:          document.getElementById("currentAge"),
  retirementAge:       document.getElementById("retirementAge"),
  currentSavings:      document.getElementById("currentSavings"),
  monthlyContribution: document.getElementById("monthlyContribution"),
  stockAllocation:     document.getElementById("stockAllocation"),
  inflationRate:       document.getElementById("inflationRate"),
  numSimulations:      document.getElementById("numSimulations"),
  crisisStartYear:     document.getElementById("crisisStartYear"),
};

const crisisSelect = document.getElementById("crisisEvent");
const crisisStartGroup = document.getElementById("crisisStartGroup");
const crisisInfo = document.getElementById("crisisInfo");

const displays = {
  currentAge:          document.getElementById("currentAgeVal"),
  retirementAge:       document.getElementById("retirementAgeVal"),
  currentSavings:      document.getElementById("currentSavingsVal"),
  monthlyContribution: document.getElementById("monthlyContributionVal"),
  stockAllocation:     document.getElementById("stockAllocationVal"),
  inflationRate:       document.getElementById("inflationRateVal"),
  numSimulations:      document.getElementById("numSimulationsVal"),
  crisisStartYear:     document.getElementById("crisisStartYearVal"),
};

const cardEls = {
  worst: document.getElementById("worstCaseVal"),
  base:  document.getElementById("baseCaseVal"),
  best:  document.getElementById("bestCaseVal"),
};

const metricEls = {
  totalPrincipal:  document.getElementById("totalPrincipalVal"),
  projectedWealth: document.getElementById("projectedWealthVal"),
  wealthGenerated: document.getElementById("wealthGeneratedVal"),
  roi:             document.getElementById("roiVal"),
};

const statusText = document.getElementById("statusText");

// ── Formatters ──
const fmtCurrency = (v) =>
  "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtNumber = (v) => Number(v).toLocaleString("en-US");

const displayFormatters = {
  currentAge:          (v) => v,
  retirementAge:       (v) => v,
  currentSavings:      (v) => fmtCurrency(v),
  monthlyContribution: (v) => fmtCurrency(v),
  stockAllocation:     (v) => `${v}%`,
  inflationRate:       (v) => `${parseFloat(v).toFixed(1)}%`,
  numSimulations:      (v) => fmtNumber(v),
  crisisStartYear:     (v) => `${v} yrs`,
};

// ── Chart.js annotation plugin (lightweight inline version) ──
// We'll draw the crisis band as a custom plugin rather than pulling in chartjs-plugin-annotation
const crisisBandPlugin = {
  id: "crisisBand",
  _crisisWindow: null,
  beforeDraw(chart) {
    const cw = crisisBandPlugin._crisisWindow;
    if (!cw) return;

    const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
    const labels = chart.data.labels;

    const startIdx = labels.indexOf(`${cw.start_age}`);
    const endIdx   = labels.indexOf(`${cw.end_age}`);
    if (startIdx === -1) return;

    const xStart = x.getPixelForValue(startIdx);
    const xEnd   = endIdx !== -1 ? x.getPixelForValue(endIdx) : x.getPixelForValue(startIdx + 1);

    // Draw red translucent band
    ctx.save();
    ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
    ctx.fillRect(xStart, top, xEnd - xStart, bottom - top);

    // Draw left edge line
    ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(xStart, top);
    ctx.lineTo(xStart, bottom);
    ctx.stroke();

    // Label
    ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
    ctx.font = "bold 11px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`⚡ ${cw.event}`, xStart + 4, top + 14);
    ctx.restore();
  },
};
Chart.register(crisisBandPlugin);

// ── Chart Setup ──
const ctx = document.getElementById("projectionChart").getContext("2d");

const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Worst Case (10th %ile)",
        data: [],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        label: "Base Case (50th %ile)",
        data: [],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2.5,
      },
      {
        label: "Best Case (90th %ile)",
        data: [],
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.08)",
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#8b8fa3",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "#1a1d28",
        titleColor: "#e2e4ed",
        bodyColor: "#e2e4ed",
        borderColor: "#2e3145",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Age",
          color: "#8b8fa3",
          font: { size: 13, weight: "600" },
        },
        ticks: { color: "#8b8fa3" },
        grid: { color: "rgba(46, 49, 69, 0.5)" },
      },
      y: {
        title: {
          display: true,
          text: "Portfolio Value (Real $)",
          color: "#8b8fa3",
          font: { size: 13, weight: "600" },
        },
        ticks: {
          color: "#8b8fa3",
          callback: (v) => {
            if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
            return `$${v}`;
          },
        },
        grid: { color: "rgba(46, 49, 69, 0.5)" },
      },
    },
  },
});

// ── Debounce Utility ──
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Update Display Values ──
function updateDisplays() {
  for (const [key, slider] of Object.entries(sliders)) {
    displays[key].textContent = displayFormatters[key](slider.value);
  }
}

// ── Update crisis UI state ──
function updateCrisisUI() {
  const event = crisisSelect.value;
  const isNone = event === "None";

  // Toggle slider visibility
  crisisStartGroup.classList.toggle("hidden", isNone);

  // Update info box
  if (isNone) {
    crisisInfo.innerHTML = "";
  } else {
    const meta = CRISIS_META[event];
    crisisInfo.innerHTML = `<span class="info-icon">📉</span> <strong>${meta.label}</strong> (${meta.years}-year shock): ${meta.desc}`;
  }

  // Clamp crisis start year so the crisis fits within the horizon
  const horizon = parseInt(sliders.retirementAge.value) - parseInt(sliders.currentAge.value);
  sliders.crisisStartYear.max = Math.max(0, horizon - 1);
  if (parseInt(sliders.crisisStartYear.value) > horizon - 1) {
    sliders.crisisStartYear.value = Math.max(0, horizon - 1);
  }
}

// ── Constraint: ensure retirement > current age ──
function enforceAgeConstraint() {
  const curAge = parseInt(sliders.currentAge.value);
  const retAge = parseInt(sliders.retirementAge.value);
  if (retAge <= curAge) {
    sliders.retirementAge.value = curAge + 1;
  }
  sliders.retirementAge.min = curAge + 1;
}

// ── API Call ──
let abortController = null;

async function runSimulation() {
  if (abortController) abortController.abort();
  abortController = new AbortController();

  enforceAgeConstraint();
  updateCrisisUI();
  updateDisplays();

  const crisisEvent = crisisSelect.value;

  const payload = {
    current_age:          parseInt(sliders.currentAge.value),
    retirement_age:       parseInt(sliders.retirementAge.value),
    current_savings:      parseFloat(sliders.currentSavings.value),
    monthly_contribution: parseFloat(sliders.monthlyContribution.value),
    stock_allocation:     parseFloat(sliders.stockAllocation.value),
    inflation_rate:       parseFloat(sliders.inflationRate.value) / 100,
    crisis_event:         crisisEvent,
    crisis_start_year:    parseInt(sliders.crisisStartYear.value),
    num_simulations:      parseInt(sliders.numSimulations.value),
  };

  statusText.textContent = "Running simulation…";
  document.querySelectorAll(".card").forEach((c) => c.classList.add("loading"));

  try {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    renderResults(data);

    const label = crisisEvent !== "None"
      ? ` | ⚡ ${CRISIS_META[crisisEvent].label} @ year ${payload.crisis_start_year}`
      : "";
    statusText.textContent = `✓ ${payload.num_simulations.toLocaleString()} simulations completed${label}`;
  } catch (err) {
    if (err.name === "AbortError") return;
    statusText.textContent = `⚠ Error: ${err.message}`;
    console.error("Simulation error:", err);
  } finally {
    document.querySelectorAll(".card").forEach((c) => c.classList.remove("loading"));
  }
}

// ── Render Results ──
function renderResults(data) {
  const { ages, paths, crisis_window, metrics } = data;
  const worst = paths.p10_worst_case;
  const base  = paths.p50_base_case;
  const best  = paths.p90_best_case;

  // Update percentile summary cards
  cardEls.worst.textContent = fmtCurrency(worst[worst.length - 1]);
  cardEls.base.textContent  = fmtCurrency(base[base.length - 1]);
  cardEls.best.textContent  = fmtCurrency(best[best.length - 1]);

  // Update investment analysis metric cards
  metricEls.totalPrincipal.textContent  = fmtCurrency(metrics.total_principal);
  metricEls.projectedWealth.textContent = fmtCurrency(metrics.projected_wealth);
  metricEls.wealthGenerated.textContent = fmtCurrency(metrics.wealth_generated);
  metricEls.roi.textContent             = `${metrics.roi_pct.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

  // Update chart data
  chart.data.labels = ages.map((a) => `${a}`);
  chart.data.datasets[0].data = worst;
  chart.data.datasets[1].data = base;
  chart.data.datasets[2].data = best;

  chart.data.datasets[0].fill = { target: "+2", above: "rgba(99, 102, 241, 0.06)" };

  // Set crisis band for the plugin
  crisisBandPlugin._crisisWindow = crisis_window;

  chart.update("none");
}

// ── Wire up all controls with debounce ──
const debouncedRun = debounce(runSimulation, DEBOUNCE_MS);

for (const slider of Object.values(sliders)) {
  slider.addEventListener("input", () => {
    enforceAgeConstraint();
    updateCrisisUI();
    updateDisplays();
    debouncedRun();
  });
}

crisisSelect.addEventListener("change", () => {
  updateCrisisUI();
  updateDisplays();
  debouncedRun();
});

// ── Initial run ──
updateCrisisUI();
updateDisplays();
runSimulation();
