import os
import joblib
from url_feature_extractor import extract_features

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

_url_model = None
_sms_model = None

def _load_url_model():
    global _url_model
    if _url_model is None:
        path = os.path.join(MODEL_DIR, "url_best_model.pkl")
        if os.path.exists(path):
            _url_model = joblib.load(path)
        else:
            raise FileNotFoundError("URL model not found. Run train_url_classifier.py first.")
    return _url_model

def _load_sms_model():
    global _sms_model
    if _sms_model is None:
        path = os.path.join(MODEL_DIR, "sms_model.pkl")
        if os.path.exists(path):
            _sms_model = joblib.load(path)
        else:
            raise FileNotFoundError("SMS model not found. Run train_sms_classifier.py first.")
    return _sms_model

def predict_url(url: str) -> dict:
    try:
        model = _load_url_model()
        features = extract_features(url)
        prediction = model.predict([features])[0]
        probability = model.predict_proba([features])[0]
        confidence = float(max(probability)) * 100

        if prediction == 1:
            if confidence >= 85:
                threat_level = "dangerous"
            else:
                threat_level = "suspicious"
        else:
            if confidence >= 85:
                threat_level = "safe"
            else:
                threat_level = "suspicious"

        reasons = _explain_url(features, prediction)

        return {
            "url": url,
            "prediction": int(prediction),
            "threat_level": threat_level,
            "confidence": round(confidence, 2),
            "is_phishing": bool(prediction == 1),
            "reasons": reasons,
            "features": {
                "url_length": features[0],
                "has_https": bool(features[4]),
                "has_ip": bool(features[5]),
                "has_suspicious_keyword": bool(features[9]),
                "subdomain_count": features[7],
            }
        }
    except FileNotFoundError as e:
        return {"error": str(e), "threat_level": "unknown"}
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}", "threat_level": "unknown"}

def predict_sms(text: str) -> dict:
    try:
        model = _load_sms_model()
        prediction = model.predict([text])[0]
        probability = model.predict_proba([text])[0]
        confidence = float(max(probability)) * 100

        threat_level = "phishing" if prediction == 1 else "legitimate"
        reasons = _explain_sms(text, prediction)

        return {
            "text": text[:100] + "..." if len(text) > 100 else text,
            "prediction": int(prediction),
            "threat_level": threat_level,
            "confidence": round(confidence, 2),
            "is_phishing": bool(prediction == 1),
            "reasons": reasons,
        }
    except FileNotFoundError as e:
        return {"error": str(e), "threat_level": "unknown"}
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}", "threat_level": "unknown"}

def _explain_url(features, prediction):
    reasons = []
    if features[0] > 75:
        reasons.append("Unusually long URL")
    if features[4] == 0:
        reasons.append("Does not use HTTPS (insecure)")
    if features[5] == 1:
        reasons.append("Uses IP address instead of domain name")
    if features[9] == 1:
        reasons.append("Contains suspicious keywords (login, verify, kyc, otp...)")
    if features[7] > 2:
        reasons.append("Excessive subdomains detected")
    if features[2] > 3:
        reasons.append("Multiple hyphens in domain (common in fake sites)")
    if features[11] == 1:
        reasons.append("Contains @ symbol (used to trick browsers)")
    if features[10] > 0:
        reasons.append("Suspicious double slashes in URL")
    if not reasons and prediction == 1:
        reasons.append("ML model detected phishing pattern")
    if not reasons and prediction == 0:
        reasons.append("No suspicious patterns detected")
    return reasons

def _explain_sms(text, prediction):
    text_lower = text.lower()
    reasons = []
    keyword_groups = {
        "Urgency language detected": ["urgent", "immediately", "expire", "suspended", "blocked", "action required"],
        "Financial scam keywords": ["bank", "account", "transaction", "credit", "debit", "payment"],
        "Credential phishing attempt": ["otp", "password", "kyc", "verify", "confirm", "update"],
        "Prize/reward scam": ["winner", "prize", "free", "congratulations", "claim", "won"],
        "Suspicious link": ["click", "http://", "bit.ly", "tinyurl"],
    }
    for reason, keywords in keyword_groups.items():
        if any(k in text_lower for k in keywords):
            reasons.append(reason)
    if not reasons and prediction == 1:
        reasons.append("ML model detected phishing pattern in message structure")
    if not reasons and prediction == 0:
        reasons.append("No phishing indicators found")
    return reasons

if __name__ == "__main__":
    print("Testing URL predictions:")
    test_urls = [
        "https://www.google.com",
        "http://paypal-verify-account.suspicious.com/login?update=kyc",
        "http://192.168.1.1/admin",
    ]
    for url in test_urls:
        result = predict_url(url)
        print(f"\nURL: {url}")
        print(f"  Threat: {result.get('threat_level')} | Confidence: {result.get('confidence')}%")
        print(f"  Reasons: {result.get('reasons')}")

    print("\nTesting SMS predictions:")
    test_sms = [
        "Your SBI account is blocked. Update KYC immediately: http://fake-sbi.com",
        "Hey, are you coming for dinner tonight?",
    ]
    for msg in test_sms:
        result = predict_sms(msg)
        print(f"\nSMS: {msg[:60]}...")
        print(f"  Threat: {result.get('threat_level')} | Confidence: {result.get('confidence')}%")
        print(f"  Reasons: {result.get('reasons')}")
