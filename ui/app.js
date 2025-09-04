// --- Constants ---
const $ = (id) => document.getElementById(id);
const SPECIES = { 0: "Setosa", 1: "Versicolor", 2: "Virginica" };
const EXAMPLES = {
  setosa:      [5.1, 3.5, 1.4, 0.2],
  versicolor:  [6.0, 2.9, 4.5, 1.5],
  virginica:   [6.3, 3.3, 6.0, 2.5],
};

// --- Elements ---
const sl = $("sl"), sw = $("sw"), pl = $("pl"), pw = $("pw");
const modelSel = $("model"), predictBtn = $("predictBtn"), spinner = $("spinner");
const statusEl = $("status"), errorEl = $("error");
const resultBox = $("resultBox"), noResult = $("noResult");
const outModel = $("outModel"), outFeatures = $("outFeatures"), outPrediction = $("outPrediction");
const outLabelWrap = $("outLabelWrap"), outLabel = $("outLabel");
const toast = $("toast"), apiInfo = $("apiInfo");

// --- Helpers ---
const urlApi = new URLSearchParams(location.search).get("api");
const API_BASE = urlApi || ""; // same-origin if empty
apiInfo.innerHTML = `API: <code>${API_BASE || "/predict"}</code>`;
$("year").textContent = new Date().getFullYear();

function fill(arr){ [sl.value, sw.value, pl.value, pw.value] = arr.map(String); }
function showToast(msg, ms=2200){ toast.textContent = msg; toast.hidden = false; setTimeout(()=>toast.hidden=true, ms); }
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
    ? SPECIES[data.prediction]
    : (data.label || "");
  if (label) { outLabel.textContent = label; outLabelWrap.hidden = false; }
  else { outLabelWrap.hidden = true; }
}

// --- Init ---
fill(EXAMPLES.setosa);
document.querySelectorAll("[data-fill]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    fill(EXAMPLES[btn.dataset.fill]); clearError(); statusEl.textContent=""; showNoResult();
    showToast(`Filled ${btn.dataset.fill}`);
  });
});
$("clearBtn").addEventListener("click", ()=>{
  [sl.value, sw.value, pl.value, pw.value] = ["","","",""]; clearError(); statusEl.textContent=""; showNoResult(); showToast("Cleared");
});

// --- Predict ---
predictBtn.addEventListener("click", async ()=>{
  clearError(); statusEl.textContent = "Predicting…"; setLoading(true); showNoResult();

  const vals = [sl, sw, pl, pw].map(f => parseFloat(f.value));
  if (vals.some(v => Number.isNaN(v))) {
    statusEl.textContent = ""; setLoading(false);
    showError("All four features must be valid numbers.");
    return;
  }

  const model = modelSel.value;
  const url = `${API_BASE}/predict`; // same-origin if API_BASE === ""

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_type: model, features: vals })
    });
    const json = await res.json().catch(()=>({ error:"Invalid JSON from server" }));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    showResult(json);
    statusEl.textContent = ""; setLoading(false);
  } catch (e) {
    statusEl.textContent = ""; setLoading(false);
    showError(e.message || String(e));
  }
});
