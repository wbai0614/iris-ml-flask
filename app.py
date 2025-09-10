from flask import Flask, request, jsonify, send_from_directory, make_response
import os
import pickle
import numpy as np
from datetime import datetime

app = Flask(__name__)

APP_NAME = "iris-ml-flask"
APP_VERSION = os.environ.get("APP_VERSION", "v1")
START_TIME = datetime.utcnow().isoformat() + "Z"

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

with open(os.path.join(MODEL_DIR, "logistic_model.pkl"), "rb") as f:
    logistic_model = pickle.load(f)

with open(os.path.join(MODEL_DIR, "kmeans_model.pkl"), "rb") as f:
    kmeans_obj = pickle.load(f)

# Support both old and new formats
if isinstance(kmeans_obj, dict) and "pipeline" in kmeans_obj and "mapping" in kmeans_obj:
    kmeans_pipeline = kmeans_obj["pipeline"]
    kmeans_mapping = kmeans_obj["mapping"]  # dict: cluster_id -> class_id
else:
    kmeans_pipeline = kmeans_obj  # legacy
    kmeans_mapping = None

SPECIES = {0: "Setosa", 1: "Versicolor", 2: "Virginica"}

@app.route("/api/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok", "app": APP_NAME, "version": APP_VERSION, "started": START_TIME}), 200

@app.route("/api/version", methods=["GET"])
def version():
    return jsonify({"app": APP_NAME, "version": APP_VERSION}), 200

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        model_type = data.get("model_type")
        features = data.get("features")

        if not model_type or features is None:
            return jsonify({"error": "model_type and features are required"}), 400

        try:
            X = np.array(features, dtype=float).reshape(1, -1)
        except Exception:
            return jsonify({"error": "features must be a list of numbers"}), 400

        if X.shape[1] != 4:
            return jsonify({"error": "expected 4 features for Iris"}), 400

        if model_type == "logreg":
            pred = int(logistic_model.predict(X)[0])

        elif model_type == "kmeans":
            cluster = int(kmeans_pipeline.predict(X)[0])
            if kmeans_mapping is not None:
                pred = int(kmeans_mapping.get(cluster, cluster))
            else:
                # Legacy: cluster labels will be arbitrary 0..2 (may not match species IDs)
                pred = cluster

        else:
            return jsonify({"error": "Invalid model_type. Use 'logreg' or 'kmeans'."}), 400

        return jsonify({
            "model_type": model_type,
            "features": features,
            "prediction": pred,
            "label": SPECIES.get(pred, str(pred))
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

UI_DIR = os.path.join(os.path.dirname(__file__), "ui")

def _send_with_cache(dirpath: str, filename: str, cache_seconds: int = 3600):
    resp = make_response(send_from_directory(dirpath, filename))
    if filename.endswith((".html", ".js", ".css")):
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
    abs_ui = os.path.abspath(UI_DIR)
    abs_req = os.path.abspath(os.path.join(UI_DIR, path))
    if not abs_req.startswith(abs_ui + os.sep) and abs_req != abs_ui:
        return jsonify({"error": "Invalid path"}), 400
    if os.path.exists(abs_req) and os.path.isfile(abs_req):
        return _send_with_cache(UI_DIR, path, cache_seconds=86400)
    return jsonify({"error": "Asset not found"}), 404

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=True)
