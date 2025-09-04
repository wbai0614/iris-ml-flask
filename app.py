from flask import Flask, request, jsonify, send_from_directory
import pickle
import numpy as np
import os

app = Flask(__name__)

# ---------- Load models ----------
with open("models/logistic_model.pkl", "rb") as f:
    logistic_model = pickle.load(f)
with open("models/kmeans_model.pkl", "rb") as f:
    kmeans_model = pickle.load(f)

# ---------- Health ----------
@app.route("/api/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok"}), 200

# ---------- Prediction ----------
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        model_type = data.get("model_type")
        features = data.get("features")

        if not model_type or features is None:
            return jsonify({"error": "model_type and features are required"}), 400

        X = np.array(features, dtype=float).reshape(1, -1)
        if X.shape[1] != 4:
            return jsonify({"error": "expected 4 features for Iris"}), 400

        if model_type == "logreg":
            pred = int(logistic_model.predict(X)[0])
        elif model_type == "kmeans":
            pred = int(kmeans_model.predict(X)[0])
        else:
            return jsonify({"error": "Invalid model_type. Use 'logreg' or 'kmeans'."}), 400

        return jsonify({
            "model_type": model_type,
            "features": features,
            "prediction": pred
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- Serve frontend at root (/) ----------
UI_DIR = os.path.join(os.path.dirname(__file__), "ui")

@app.route("/", methods=["GET"])
def index():
    index_path = os.path.join(UI_DIR, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(UI_DIR, "index.html")
    return jsonify({"error": "UI not found"}), 404

@app.route("/<path:path>", methods=["GET"])
def static_files(path):
    file_path = os.path.join(UI_DIR, path)
    if os.path.exists(file_path):
        return send_from_directory(UI_DIR, path)
    return jsonify({"error": "Asset not found"}), 404

if __name__ == "__main__":
    # Local dev convenience (Cloud Run will use gunicorn)
    app.run(host="0.0.0.0", port=8080, debug=True)
