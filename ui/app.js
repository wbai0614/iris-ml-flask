// ---------- Constants & Elements ----------
const $ = (id) => document.getElementById(id);
const SPECIES = { 0: "Setosa", 1: "Versicolor", 2: "Virginica" };
const EXAMPLES = {
  setosa:      [5.1, 3.5, 1.4, 0.2],
  versicolor:  [6.0, 2.9, 4.5, 1.5],
  virginica:   [6.3, 3.3, 6.0, 2.5],
};
const sl = $("sl"), sw = $("sw"), pl = $("pl"), pw = $("pw");
const modelSel = $("model"), keepHistory = $("keepHistory");
const predictBtn = $("predictBtn"), spinner = $("spinner"), cancelBtn = $("cancelBtn");
const statusEl = $("status"), errorEl = $("error");
const resultBox = $("resultBox"), noResult = $("noResult");
const outModel = $("outModel"), outFeatures = $("outFeatures"), outPrediction = $("outPrediction");
const outLabelWrap = $("outLabelWrap"), outLabel = $("outLabel");
const apiInfo = $("apiInfo"), yearEl = $("year"), toast = $("toast");
const historyEl = $("history"), histCount = $("histCount");
const copyLinkBtn = $("copyLinkBtn"), serviceUrl = $("serviceUrl");
const chartCanvas = $("modelChart");

// ---------- Utility ----------
yearEl.textContent = new Date().getFullYear();
const urlApi = new URLSearchParams(location.search).get("api");
const API_BASE = urlApi || ""; // same-origin by default
apiInfo.innerHTML = `API: <code>${API_BASE || "/predict"}</code>`;
serviceUrl.textContent = location.host;

// Basic toast
function showToast(msg, ms=2000){ toast.textContent = msg; toast.hidden = false; setTimeout(()=>toast.hidden=true, ms); }
function setLoading(on){ spinner.hidden = !on; predictBtn.disabled = on; cancelBtn.hidden = !on; }
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
  if (label){ outLabel.textContent = label; outLabelWrap.hidden = false; } else { outLabelWrap.hidden = true; }
}

// ---------- Prefill & Buttons ----------
function fill(arr){ [sl.value, sw.value, pl.value, pw.value] = arr.map(String); }
fill(EXAMPLES.setosa);

document.querySelectorAll("[data-fill]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    fill(EXAMPLES[btn.dataset.fill]);
    clearError(); statusEl.textContent = ""; showNoResult();
    showToast(`Filled ${btn.dataset.fill}`);
  });
});
$("clearBtn").addEventListener("click", ()=>{
  [sl.value, sw.value, pl.value, pw.value] = ["","","",""];
  clearError(); statusEl.textContent = ""; showNoResult(); showToast("Cleared");
});

// ---------- Shareable Link ----------
copyLinkBtn.addEventListener("click", async ()=>{
  const params = new URLSearchParams({
    sl: sl.value || "", sw: sw.value || "", pl: pl.value || "", pw: pw.value || "",
    model: modelSel.value
  });
  const shareUrl = `${location.origin}${location.pathname}?${params.toString()}`;
  try{
    await navigator.clipboard.writeText(shareUrl);
    showToast("Link copied!");
  }catch{ showToast("Copy failed"); }
});

// Hydrate from URL if present
(function hydrateFromUrl(){
  const q = new URLSearchParams(location.search);
  if (q.has("sl")) sl.value = q.get("sl");
  if (q.has("sw")) sw.value = q.get("sw");
  if (q.has("pl")) pl.value = q.get("pl");
  if (q.has("pw")) pw.value = q.get("pw");
  if (q.has("model")) modelSel.value = q.get("model");
})();

// ---------- History (localStorage) ----------
const HIST_KEY = "iris_history_v2";
function getHist(){ try{ return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); }catch{ return []; } }
function setHist(arr){ localStorage.setItem(HIST_KEY, JSON.stringify(arr.slice(-20))); } // keep last 20
function renderHist(){
  const items = getHist();
  histCount.textContent = items.length;
  historyEl.innerHTML = "";
  items.slice().reverse().forEach((h, idx)=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="row" style="justify-content:space-between;">
        <div class="tiny muted">${new Date(h.t).toLocaleString()}</div>
        <span class="badge">${h.model}</span>
      </div>
      <div class="row" style="justify-content:space-between;">
        <code class="wrap tiny">[${h.features.join(", ")}]</code>
        <strong class="pred">${typeof h.pred === "number" ? h.pred : h.pred ?? "—"}</strong>
      </div>
      ${h.label ? `<div class="tiny">Label: <b>${h.label}</b></div>` : ""}
    `;
    historyEl.appendChild(li);
  });
}
renderHist();

// ---------- Tiny Chart (Canvas) ----------
function drawChart(){
  const ctx = chartCanvas.getContext("2d");
  const W = chartCanvas.width, H = chartCanvas.height;
  ctx.clearRect(0,0,W,H);
  const items = getHist();
  const counts = { logreg:0, kmeans:0 };
  items.forEach(i => { if (i.model === "logreg") counts.logreg++; else if (i.model === "kmeans") counts.kmeans++; });
  const total = Math.max(1, counts.logreg + counts.kmeans);
  // bars
  const pad = 30, barW = 100, gap = 40, baseY = H - 30, maxH = H - 70;
  const vals = [counts.logreg, counts.kmeans];
  const labels = ["logreg", "kmeans"];
  vals.forEach((v, i)=>{
    const x = pad + i*(barW+gap);
    const h = Math.round((v/total)*maxH);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--brand") || "#4f46e5";
    ctx.fillRect(x, baseY - h, barW, h);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("color");
    ctx.font = "12px system-ui, -apple-system, Segoe UI";
    ctx.fillText(labels[i], x, baseY + 16);
    ctx.fillText(String(v), x + barW/2 - 6, baseY - h - 6);
  });
}
drawChart();

// Redraw on theme change (optional improvement)
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", drawChart);

// ---------- Predict with timeout/retry/cancel ----------
let inflightController = null;

$("predictBtn").addEventListener("click", async ()=>{
  clearError(); statusEl.textContent = "Predicting…"; setLoading(true); showNoResult();

  const vals = [sl, sw, pl, pw].map(f => parseFloat(f.value));
  if (vals.some(v => Number.isNaN(v))) {
    statusEl.textContent = ""; setLoading(false);
    showError("All four features must be valid numbers.");
    return;
  }
  const model = modelSel.value;
  const url = `${API_BASE}/predict`;

  // Abort previous
  if (inflightController) inflightController.abort();
  inflightController = new AbortController();
  cancelBtn.onclick = () => inflightController?.abort();

  const body = JSON.stringify({ model_type: model, features: vals });
  const attempt = async (msTimeout) => {
    const t = setTimeout(()=> inflightController?.abort(), msTimeout);
    try{
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body, signal: inflightController.signal
      });
      clearTimeout(t);
      const json = await res.json().catch(()=>({ error:"Invalid JSON from server" }));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    }catch(err){
      clearTimeout(t);
      throw err;
    }
  };

  try{
    // First try: 5s timeout; on failure (network/abort), retry once (8s)
    let json;
    try { json = await attempt(5000); }
    catch { json = await attempt(8000); }

    showResult(json);
    statusEl.textContent = "";
    setLoading(false);

    // Save history
    if (keepHistory.checked){
      const item = {
        t: Date.now(),
        model,
        features: vals,
        pred: json.prediction,
        label: (typeof json.prediction === "number" && SPECIES[json.prediction] !== undefined) ? SPECIES[json.prediction] : (json.label || "")
      };
      const arr = getHist(); arr.push(item); setHist(arr);
      renderHist(); drawChart();
    }
  }catch(e){
    if (e.name === "AbortError") showError("Request cancelled.");
    else showError(e.message || "Prediction failed.");
    statusEl.textContent = "";
    setLoading(false);
  }finally{
    inflightController = null;
  }
});
