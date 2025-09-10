# train_models.py
import os
import pickle
import numpy as np
from collections import Counter

from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans

RANDOM_STATE = 42

def main():
    X, y = load_iris(return_X_y=True)  # order: [sepal len, sepal wid, petal len, petal wid]
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )

    os.makedirs("models", exist_ok=True)

    # ----- Logistic Regression -----
    logreg_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=1000, multi_class="auto", random_state=RANDOM_STATE)),
    ])
    logreg_pipe.fit(X_tr, y_tr)
    acc_tr = logreg_pipe.score(X_tr, y_tr)
    acc_te = logreg_pipe.score(X_te, y_te)
    print(f"LogReg accuracy train={acc_tr:.3f} test={acc_te:.3f}")

    with open("models/logistic_model.pkl", "wb") as f:
        pickle.dump(logreg_pipe, f)

    # ----- K-Means with mapping -----
    kmeans_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("kmeans", KMeans(n_clusters=3, n_init=10, random_state=RANDOM_STATE)),
    ])
    kmeans_pipe.fit(X_tr)
    clusters_tr = kmeans_pipe.named_steps["kmeans"].labels_

    cluster_to_class = {}
    for c in range(3):
        y_c = y_tr[clusters_tr == c]
        majority = Counter(y_c).most_common(1)[0][0]
        cluster_to_class[c] = int(majority)
    print("Cluster→Class mapping:", cluster_to_class)

    # Evaluate mapped KMeans on test
    clusters_te = kmeans_pipe.predict(X_te)
    y_pred_te = np.array([cluster_to_class[int(c)] for c in clusters_te])
    acc_k_te = (y_pred_te == y_te).mean()
    print(f"KMeans(mapped) accuracy test={acc_k_te:.3f}")

    with open("models/kmeans_model.pkl", "wb") as f:
        pickle.dump({"pipeline": kmeans_pipe, "mapping": cluster_to_class}, f)

if __name__ == "__main__":
    main()
