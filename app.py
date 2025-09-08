from flask import Flask, request, jsonify, send_from_directory, make_response
import os
import pickle
import numpy as np
from datetime import datetime

app = Flask(__name__)

# -----------------------------
# App metadata
# -----------------------------
APP_NAME = "iris-ml-flask"
APP_VERSION = os.environ.get("APP_VERSION", "v1")  # set at build/deploy if you want
START_TIME = datetime.utcnow().isoformat() + "Z"

# -----------------------------
# Load models once at startup
# -----------------------------
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

with open(os.path.join(MODEL_DIR, "logistic_model.pkl"), "rb") as f:
    logistic_model = pickle.load(f)

with open(os.path.join(MODEL_DIR, "kmeans_model.pkl"), "rb") as f:
    kmeans_model = pickle.load(f)

# Optional: map numeric classes to labels
SPECIES = {0: "Setosa", 1: "Versicolor", 2: "Virginica"}

# -----------------------------
# Health & Version
# -----------------------------
@app.route("/api/healthz", methods=["GET"])
def healthz():
    return jsonify({
        "status": "ok",
        "app": APP_NAME,
        "version": APP_VERSION,
        "started": START_TIME
    }), 200

@app.route("/api/version", methods=["GET"])
def version():
    return jsonify({
        "app": APP_NAME,
        "version": APP_VERSION
    }), 200

# -----------------------------
# Prediction API
# -----------------------------
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        model_type = data.get("model_type")
        features = data.get("features")

        if not model_type or features is None:
            return jsonify({"error": "model_type and features are required"}), 400

        # Expect 4 Iris features
        try:
            X = np.array(features, dtype=float).reshape(1, -1)
        except Exception:
            return jsonify({"error": "features must be a list of numbers"}), 400

        if X.shape[1] != 4:
            return jsonify({"error": "expected 4 features for Iris"}), 400

        if model_type == "logreg":
            pred = int(logistic_model.predict(X)[0])
        elif model_type == "kmeans":
            pred = int(kmeans_model.predict(X)[0])
        else:
            return jsonify({"error": "Invalid model_type. Use 'logreg' or 'kmeans'."}), 400

        resp = {
            "model_type": model_type,
            "features": features,
            "prediction": pred,
            "label": SPECIES.get(pred, str(pred))
        }
        return jsonify(resp), 200

    except Exception as e:
        # For demo: return the error. In production, log internally and return a generic message.
        return jsonify({"error": str(e)}), 500

# -----------------------------
# Static UI @ /
# -----------------------------
UI_DIR = os.path.join(os.path.dirname(__file__), "ui")

def _send_with_cache(dirpath: str, filename: str, cache_seconds: int = 3600):
    """Serve a file with Cache-Control (no-cache for index.html)."""
    resp = make_response(send_from_directory(dirpath, filename))
    if filename == "index.html":
        resp.headers["Cache-Control"] = "no-cache"
    else:
        resp.headers["Cache-Control"] = f"public, max-age={cache_seconds}"
    return resp

@app.route("/", methods=["GET"])
def index():
    ix = os.path.join(UI_DIR, "index.html")
    if os.path.exists(ix):
        return _send_with_cache(UI_DIR, "index.html", cache_seconds=0)
    return jsonify({"error": "UI not found"}), 404

@app.route("/<path:path>", methods=["GET"])
def ui_assets(path):
    # Prevent directory traversal; only serve files under ./ui
    abs_ui = os.path.abspath(UI_DIR)
    abs_req = os.path.abspath(os.path.join(UI_DIR, path))
    if not abs_req.startswith(abs_ui + os.sep) and abs_req != abs_ui:
        return jsonify({"error": "Invalid path"}), 400
    if os.path.exists(abs_req) and os.path.isfile(abs_req):
        # Long cache for static assets (CSS/JS/images)
        return _send_with_cache(UI_DIR, path, cache_seconds=86400)
    return jsonify({"error": "Asset not found"}), 404

# -----------------------------
# Local dev entrypoint
# (Cloud Run uses Gunicorn via Docker CMD)
# -----------------------------
if __name__ == "__main__":
    # Run locally: python app.py
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=True)
