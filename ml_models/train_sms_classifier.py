import pandas as pd
import numpy as np
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline

DATASET_PATH = "../datasets/SMSSpamCollection"
MODEL_DIR = "."

PHISHING_KEYWORDS = [
    "otp", "kyc", "verify", "account", "bank", "credit", "debit",
    "password", "urgent", "winner", "prize", "claim", "free",
    "click", "link", "update", "expire", "suspend", "confirm",
    "transaction", "blocked", "alert", "immediate", "action required"
]

def load_sms_data():
    print("[*] Loading SMS dataset...")
    tried = []

    paths_to_try = [
        "../datasets/sms.tsv",
        DATASET_PATH,
        "../datasets/SMSSpamCollection",
        "../datasets/spam.csv",
        "../datasets/sms_spam.csv",
    ]

    df = None
    for path in paths_to_try:
        tried.append(path)
        if os.path.exists(path):
            try:
                if path.endswith(".csv"):
                    df = pd.read_csv(path, encoding="latin-1")
                    for col in df.columns:
                        if df[col].nunique() == 2:
                            label_col = col
                        else:
                            text_col = col
                    df = df[[label_col, text_col]]
                    df.columns = ["label", "text"]
                elif path.endswith(".tsv"):
                    df = pd.read_csv(path, sep="\t", header=None, names=["label", "text"], encoding="latin-1")
                else:
                    df = pd.read_csv(path, sep="\t", header=None, names=["label", "text"], encoding="latin-1")
                print(f"[+] Loaded from: {path}")
                break
            except Exception as e:
                print(f"[!] Failed to load {path}: {e}")

    if df is None:
        print(f"[!] Could not find SMS dataset. Tried: {tried}")
        print("[*] Generating synthetic dataset for demonstration...")
        df = generate_synthetic_data()

    df = df.dropna()
    label_map = {}
    for val in df["label"].unique():
        v = str(val).lower()
        if any(x in v for x in ["spam", "phish", "1", "ham"]):
            label_map[val] = 1 if "spam" in v or "phish" in v else 0
        else:
            label_map[val] = 0
    df["label"] = df["label"].map(label_map).fillna(0).astype(int)

    print(f"[*] Total samples: {len(df)}")
    print(f"[*] Label distribution:\n{df['label'].value_counts()}")
    return df

def generate_synthetic_data():
    spam_msgs = [
        "URGENT: Your bank account has been suspended. Click here to verify your KYC immediately.",
        "Congratulations! You have won Rs 50,000. Claim your prize now by clicking this link.",
        "Your OTP is expiring. Please update your account details to avoid suspension.",
        "FREE: Get a free iPhone now! Limited offer. Click the link to claim.",
        "Your SBI account is blocked. Verify your details immediately to unblock.",
        "Dear customer, your PAN card is not linked. Update now or account will be closed.",
        "You have a pending transaction of Rs 9999. Confirm your password to proceed.",
        "Alert: Suspicious login detected. Verify your identity now: http://fake-bank.com",
    ] * 50
    ham_msgs = [
        "Hey, are you coming to the meeting tomorrow?",
        "Can you pick up some groceries on your way home?",
        "The project deadline has been moved to Friday.",
        "Happy birthday! Hope you have a wonderful day.",
        "Please find attached the report you requested.",
        "Lunch at 1pm? Let me know if that works.",
        "The package has been delivered to your door.",
        "Reminder: Doctor appointment at 3pm today.",
    ] * 50
    labels = [1] * len(spam_msgs) + [0] * len(ham_msgs)
    texts = spam_msgs + ham_msgs
    return pd.DataFrame({"label": labels, "text": texts})

def train_sms_model(df):
    X = df["text"].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\n[*] Training set: {len(X_train)} | Test set: {len(X_test)}")
    print("[*] Training TF-IDF + Logistic Regression pipeline...")

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words="english",
            lowercase=True,
            sublinear_tf=True
        )),
        ("clf", LogisticRegression(
            C=1.0, max_iter=1000,
            class_weight="balanced",
            random_state=42
        ))
    ])

    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"[+] SMS Classifier Accuracy: {acc:.4f} ({acc*100:.2f}%)")
    print(classification_report(y_test, preds, target_names=["Legitimate", "Phishing/Spam"]))

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, os.path.join(MODEL_DIR, "sms_model.pkl"))
    print("[+] Model saved: sms_model.pkl")

    test_messages = [
        "Your account has been suspended. Verify KYC immediately to avoid closure.",
        "Hey, are you free for lunch tomorrow?",
        "URGENT: OTP expires in 5 mins. Click link to update your bank details now.",
        "Meeting rescheduled to 3pm. Please confirm attendance.",
    ]
    print("\n[*] Quick test predictions:")
    for msg in test_messages:
        pred = pipeline.predict([msg])[0]
        prob = pipeline.predict_proba([msg])[0][1]
        status = "PHISHING/SPAM" if pred == 1 else "LEGITIMATE"
        print(f"  [{status}] ({prob*100:.1f}% confidence) {msg[:60]}...")

    return pipeline

if __name__ == "__main__":
    print("=" * 50)
    print("  SMS Phishing Classifier - Training Script")
    print("=" * 50)
    df = load_sms_data()
    train_sms_model(df)
    print("\n[✓] Training complete!")
