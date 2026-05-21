import pandas as pd
import numpy as np
import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from xgboost import XGBClassifier

DATASET_PATHS = [
    "../datasets/phishing.csv",
    "../datasets/phishing_site_urls.csv",
    "../datasets/dataset.csv",
    "../datasets/verified_online.csv",
]

MODEL_DIR = "."

FEATURE_COLS = [
    "UsingIP", "LongURL", "ShortURL", "Symbol@", "Redirecting//",
    "PrefixSuffix-", "SubDomains", "HTTPS", "DomainRegLen", "Favicon",
    "NonStdPort", "HTTPSDomainURL", "RequestURL", "AnchorURL",
    "LinksInScriptTags", "ServerFormHandler", "InfoEmail", "AbnormalURL",
    "WebsiteForwarding", "StatusBarCust", "DisableRightClick",
    "UsingPopupWindow", "IframeRedirection", "AgeofDomain", "DNSRecording",
    "WebsiteTraffic", "PageRank", "GoogleIndex", "LinksPointingToPage",
    "StatsReport"
]

def load_data():
    print("[*] Looking for dataset...")
    df = None
    for path in DATASET_PATHS:
        if os.path.exists(path):
            df = pd.read_csv(path)
            print(f"[+] Loaded: {path}")
            break

    if df is None:
        print("[!] Dataset not found. Tried:")
        for p in DATASET_PATHS:
            print(f"    {p}")
        return None, None, None

    print(f"[*] Shape: {df.shape}")
    print(f"[*] Columns: {list(df.columns)}")

    label_col = "class" if "class" in df.columns else None
    if label_col is None:
        for col in df.columns:
            if col.lower() in ["class", "label", "result", "type", "target"]:
                label_col = col
                break

    if label_col is None:
        print("[!] Could not find label column.")
        return None, None, None

    print(f"[*] Label column: '{label_col}'")
    print(f"[*] Class distribution:\n{df[label_col].value_counts()}")

    feature_cols = [c for c in FEATURE_COLS if c in df.columns]
    if len(feature_cols) < 5:
        feature_cols = [c for c in df.columns if c not in [label_col, "Index", "index"]]
    print(f"[*] Using {len(feature_cols)} feature columns")

    X = df[feature_cols].fillna(0)
    y = df[label_col].apply(lambda v: 1 if v == 1 else 0)

    print(f"[*] Final label distribution: {dict(y.value_counts())}")
    return X, y, feature_cols

def train_models(X, y, feature_cols):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n[*] Train: {len(X_train)} | Test: {len(X_test)}")

    print("\n[*] Training Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=100, max_depth=20,
        min_samples_split=5, random_state=42, n_jobs=-1
    )
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    rf_acc = accuracy_score(y_test, rf_preds)
    print(f"[+] Random Forest Accuracy: {rf_acc*100:.2f}%")
    print(classification_report(y_test, rf_preds, target_names=["Legitimate", "Phishing"]))

    print("[*] Training XGBoost...")
    xgb = XGBClassifier(
        n_estimators=100, max_depth=6, learning_rate=0.1,
        eval_metric="logloss", random_state=42, n_jobs=-1
    )
    xgb.fit(X_train, y_train)
    xgb_preds = xgb.predict(X_test)
    xgb_acc = accuracy_score(y_test, xgb_preds)
    print(f"[+] XGBoost Accuracy: {xgb_acc*100:.2f}%")
    print(classification_report(y_test, xgb_preds, target_names=["Legitimate", "Phishing"]))

    best = rf if rf_acc >= xgb_acc else xgb
    best_name = "RandomForest" if rf_acc >= xgb_acc else "XGBoost"
    best_acc = max(rf_acc, xgb_acc)
    print(f"\n[+] Best model: {best_name} ({best_acc*100:.2f}%)")

    joblib.dump(rf, os.path.join(MODEL_DIR, "url_rf_model.pkl"))
    joblib.dump(xgb, os.path.join(MODEL_DIR, "url_xgb_model.pkl"))
    joblib.dump(best, os.path.join(MODEL_DIR, "url_best_model.pkl"))
    joblib.dump(feature_cols, os.path.join(MODEL_DIR, "url_feature_cols.pkl"))

    with open(os.path.join(MODEL_DIR, "url_model_info.txt"), "w") as f:
        f.write(f"Best model: {best_name}\n")
        f.write(f"Accuracy: {best_acc*100:.2f}%\n")
        f.write(f"RF Accuracy: {rf_acc*100:.2f}%\n")
        f.write(f"XGB Accuracy: {xgb_acc*100:.2f}%\n")
        f.write(f"Features: {feature_cols}\n")

    print("[+] Saved: url_best_model.pkl, url_rf_model.pkl, url_xgb_model.pkl, url_feature_cols.pkl")

    importances = pd.Series(best.feature_importances_, index=feature_cols)
    top5 = importances.nlargest(5)
    print("\n[*] Top 5 most important features:")
    for feat, score in top5.items():
        print(f"    {feat}: {score:.4f}")

if __name__ == "__main__":
    print("=" * 50)
    print("  URL Phishing Classifier - Training Script")
    print("=" * 50)
    X, y, feature_cols = load_data()
    if X is not None:
        train_models(X, y, feature_cols)
        print("\n[✓] Training complete!")
    else:
        print("\n[!] Training failed. Check dataset path.")