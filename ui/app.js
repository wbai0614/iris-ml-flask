const $ = (id) => document.getElementById(id);

const sl = $("sl"), sw = $("sw"), pl = $("pl"), pw = $("pw");
const modelSel = $("model");
const predictBtn = $("predictBtn");
const spinner = $("spinner");
const errorEl = $("error");
const statusEl = $("status");
const resultBox = $("resultBox");
const noResult = $("noResult");
const outModel = $("outModel");
const outFeatures = $("outFeatures");
const outPrediction = $("outPrediction");
const outLabelWrap = $("outLabelWrap");
const outLabel = $("outLabel");
const healthDot = $("healthDot");
const yearEl = $("year");
const footVersion = $("footVersion");

yearEl.textContent = new Date().getFullYear();

const SPECIES = { 0: "Setosa", 1: "Versicolor", 2: "Virginica" };

const urlApi = new URLSearchParams(location.search).get("api");
const API_BASE = urlApi ? urlApi.replace(/\/$/, "") : "";

function setLoading(on){ spinner.hidden = !on; predictBtn.disabled = on; }
function showError(msg){ errorEl.textContent = msg; errorEl.hidden = false; }
function clearError(){ errorEl.hidden = true; }
function showNoResult(){ resultBox.hidden = true; noResult.hidden = false; }
function showResult(data){
  noResult.hidden = true; resultBox.hidden = false;
  outModel.textContent = data.model_type;
  outFeatures.textContent = JSON.stringify(data.features);
  outPrediction.textContent = String(data.prediction);
  const label = (typeof data.prediction === "number" && SPECIES[data.prediction] !== undefined)
    ? SPECIES[data.prediction] : (data.label || "");
  outLabelWrap.hidden = !label;
  if (label) outLabel.textContent = label;
}

// Initial clean state
setLoading(false); clearError(); showNoResult();

// Health ping + version fetch
(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/healthz`, { cache: "no-store" });
    healthDot.textContent = res.ok ? "OK" : "Degraded";
    healthDot.style.color = res.ok ? "var(--ok)" : "var(--warn)";
  } catch {
    healthDot.textContent = "Offline";
    healthDot.style.color = "var(--danger)";
  }
  try {
    const resV = await fetch(`${API_BASE}/api/version`, { cache: "no-store" });
    if (resV.ok) {
      const v = await resV.json();
      footVersion.textContent = v?.version || "v?";
    }
  } catch { /* ignore */ }
})();

// Predict
predictBtn.addEventListener("click", async () => {
  clearError(); statusEl.textContent = "Predicting…"; setLoading(true); showNoResult();

  const vals = [sl, sw, pl, pw].map(f => parseFloat(f.value));
  if (vals.some(v => Number.isNaN(v))) {
    statusEl.textContent = ""; setLoading(false);
    return showError("All four features must be valid numbers.");
  }

  const payload = { model_type: modelSel.value, features: vals };
  const url = `${API_BASE}/predict`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { throw new Error("Invalid JSON from server"); }
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

    showResult(json);
    statusEl.textContent = "";
  } catch (e) {
    console.error(e);
    statusEl.textContent = "";
    showError(e.message || "Prediction failed.");
  } finally {
    setLoading(false);
  }
});
