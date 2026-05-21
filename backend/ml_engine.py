"""
ml_engine.py
Loads saved .pkl models from ../ml_models/ and exposes prediction helpers
for URL phishing detection and SMS phishing detection.
"""

import os
import pickle
import logging
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent          # backend/
ML_DIR   = BASE_DIR.parent / "ml_models"            # ml_models/

URL_MODEL_PATH    = ML_DIR / "url_best_model.pkl"
URL_COLS_PATH     = ML_DIR / "url_feature_cols.pkl"
SMS_MODEL_PATH    = ML_DIR / "sms_model.pkl"

# ─── Feature metadata ─────────────────────────────────────────────────────────
# Maps each feature name → a human-readable risk explanation when value == 1
FEATURE_RISK_EXPLANATIONS: Dict[str, str] = {
    "UsingIP":              "URL uses a raw IP address instead of a domain name",
    "LongURL":              "URL is unusually long (common obfuscation tactic)",
    "ShortURL":             "URL uses a URL-shortening service (hides destination)",
    "Symbol@":              "URL contains '@' symbol (can redirect to malicious host)",
    "Redirecting//":        "URL contains '//' redirection pattern",
    "PrefixSuffix-":        "Domain contains hyphens (common in fake domains)",
    "SubDomains":           "URL has multiple sub-domains (phishing impersonation pattern)",
    "HTTPS":                "Page does not use HTTPS (insecure connection)",
    "DomainRegLen":         "Domain was registered recently (newly created suspicious site)",
    "Favicon":              "Favicon is loaded from an external domain",
    "NonStdPort":           "URL uses a non-standard port",
    "HTTPSDomainURL":       "HTTPS token appears in the domain part (fake security indicator)",
    "RequestURL":           "Most page resources are loaded from external domains",
    "AnchorURL":            "Anchor tags point mostly to external/empty destinations",
    "LinksInScriptTags":    "Scripts/links reference external domains heavily",
    "ServerFormHandler":    "Form submits data to a suspicious server or email",
    "InfoEmail":            "Page uses mailto links to collect information",
    "AbnormalURL":          "URL structure does not match the registered domain",
    "WebsiteForwarding":    "Site performs multiple redirects",
    "StatusBarCust":        "JavaScript customises the browser status bar",
    "DisableRightClick":    "Right-click is disabled (hides source code)",
    "UsingPopupWindow":     "Site uses popup windows to collect credentials",
    "IframeRedirection":    "Page embeds hidden iframes",
    "AgeofDomain":          "Domain is less than 6 months old",
    "DNSRecording":         "No DNS record found for the domain",
    "WebsiteTraffic":       "Website has very low or no traffic ranking",
    "PageRank":             "Page has zero or negligible PageRank",
    "GoogleIndex":          "Page is not indexed by Google",
    "LinksPointingToPage":  "Very few external links point to this page",
    "StatsReport":          "Domain appears in phishing/spam blacklists",
}

# SMS keywords that are strong phishing indicators
SMS_PHISHING_KEYWORDS: List[str] = [
    "won", "winner", "prize", "lottery", "free", "claim",
    "urgent", "immediately", "expires", "suspended", "verify",
    "confirm", "click", "link", "bank", "account", "password",
    "otp", "pin", "credit", "debit", "blocked", "unauthorized",
    "congratulations", "selected", "reward", "gift", "limited",
    "offer", "exclusive", "act now", "call now", "text back",
]

# ─── Model container ──────────────────────────────────────────────────────────

class MLEngine:
    def __init__(self):
        self.url_model = None
        self.url_feature_cols: List[str] = []
        self.sms_model = None
        self._loaded = False

    # ── Loader ────────────────────────────────────────────────────────────────

    def load_models(self) -> None:
        errors = []

        # URL model
        try:
            with open(URL_MODEL_PATH, "rb") as f:
                self.url_model = pickle.load(f)
            logger.info(f"URL model loaded from {URL_MODEL_PATH}")
        except FileNotFoundError:
            errors.append(f"URL model not found at {URL_MODEL_PATH}")
        except Exception as e:
            errors.append(f"URL model load error: {e}")

        # URL feature columns
        try:
            with open(URL_COLS_PATH, "rb") as f:
                self.url_feature_cols = pickle.load(f)
            logger.info(f"URL feature cols loaded ({len(self.url_feature_cols)} features)")
        except FileNotFoundError:
            # Fall back to the canonical 30-feature list defined at top of file
            self.url_feature_cols = list(FEATURE_RISK_EXPLANATIONS.keys())
            logger.warning("url_feature_cols.pkl not found — using built-in feature list")
        except Exception as e:
            errors.append(f"Feature cols load error: {e}")

        # SMS model
        try:
            self.sms_model = joblib.load(SMS_MODEL_PATH)
            logger.info(f"SMS model loaded from {SMS_MODEL_PATH}")
        except FileNotFoundError:
            errors.append(f"SMS model not found at {SMS_MODEL_PATH}")
        except Exception as e:
            errors.append(f"SMS model load error: {e}")

        if errors:
            for err in errors:
                logger.error(err)
            raise RuntimeError("Some ML models failed to load:\n" + "\n".join(errors))

        self._loaded = True

    # ── URL Prediction ────────────────────────────────────────────────────────

    def predict_url(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes a dict of pre-extracted features (matching url_feature_cols)
        and returns prediction details.

        Expected input format:
          {
            "UsingIP": 0, "LongURL": 1, "ShortURL": 0, ...   (30 binary/int features)
          }
        Labels: 1 = phishing, 0 = legitimate
        """
        if not self._loaded or self.url_model is None:
            raise RuntimeError("URL model is not loaded")

        # Build ordered feature vector
        row = {col: features.get(col, 0) for col in self.url_feature_cols}
        df  = pd.DataFrame([row])

        prediction    = int(self.url_model.predict(df)[0])          # 0 or 1
        proba         = self.url_model.predict_proba(df)[0]          # [p_legit, p_phish]
        phish_proba   = float(proba[1]) if len(proba) > 1 else float(proba[0])
        confidence    = phish_proba if prediction == 1 else (1.0 - phish_proba)

        # Feature importances (available for tree-based models)
        top_features  = self._get_top_risk_features(df, prediction)

        return {
            "prediction":    "phishing" if prediction == 1 else "legitimate",
            "is_phishing":   prediction == 1,
            "confidence":    round(confidence, 4),
            "phish_proba":   round(phish_proba, 4),
            "top_features":  top_features,
        }

    def _get_top_risk_features(
        self,
        df: pd.DataFrame,
        prediction: int,
        top_n: int = 5
    ) -> List[Dict[str, Any]]:
        """Return the top N features that contributed most to the decision."""
        results = []

        # Tree-based models expose feature_importances_
        if hasattr(self.url_model, "feature_importances_"):
            importances = self.url_model.feature_importances_
            cols        = df.columns.tolist()
            scored = sorted(
                zip(cols, importances, df.iloc[0].tolist()),
                key=lambda x: x[1],
                reverse=True
            )
            for feat_name, importance, value in scored[:top_n]:
                results.append({
                    "feature":            feat_name,
                    "value":              int(value),
                    "importance":         round(float(importance), 4),
                    "risk_contribution":  FEATURE_RISK_EXPLANATIONS.get(feat_name, feat_name),
                    "flagged":            int(value) == 1,
                })

        # Pipeline models (e.g. wrapped in a Pipeline) — best effort
        elif hasattr(self.url_model, "estimators_"):
            cols   = df.columns.tolist()
            values = df.iloc[0].tolist()
            for feat_name, value in zip(cols, values):
                if int(value) == 1:
                    results.append({
                        "feature":            feat_name,
                        "value":              1,
                        "importance":         None,
                        "risk_contribution":  FEATURE_RISK_EXPLANATIONS.get(feat_name, feat_name),
                        "flagged":            True,
                    })
            results = results[:top_n]

        return results

    def build_url_reasons(self, ml_result: Dict[str, Any], features: Dict[str, Any]) -> List[str]:
        """Convert ML result into human-readable reason strings."""
        reasons = []

        if ml_result["is_phishing"]:
            reasons.append(
                f"ML model classified this URL as phishing "
                f"(confidence: {ml_result['confidence']*100:.1f}%)"
            )
        else:
            reasons.append(
                f"ML model classified this URL as legitimate "
                f"(confidence: {ml_result['confidence']*100:.1f}%)"
            )

        for feat in ml_result.get("top_features", []):
            if feat.get("flagged"):
                reasons.append(f"⚠ {feat['risk_contribution']}")

        return reasons

    # ── SMS Prediction ────────────────────────────────────────────────────────

    def predict_sms(self, message: str) -> Dict[str, Any]:
        """
        Takes a raw SMS string and returns prediction details.
        The sms_model is a TF-IDF + Logistic Regression Pipeline.
        Labels: 1 = spam/phishing, 0 = ham/legitimate.
        """
        if not self._loaded or self.sms_model is None:
            raise RuntimeError("SMS model is not loaded")

        prediction  = int(self.sms_model.predict([message])[0])
        proba       = self.sms_model.predict_proba([message])[0]
        phish_proba = float(proba[1]) if len(proba) > 1 else float(proba[0])
        confidence  = phish_proba if prediction == 1 else (1.0 - phish_proba)

        triggered   = self._find_triggered_keywords(message)
        reasons     = self._build_sms_reasons(prediction, confidence, triggered)

        return {
            "prediction":         "phishing" if prediction == 1 else "legitimate",
            "is_phishing":        prediction == 1,
            "confidence":         round(confidence, 4),
            "phish_proba":        round(phish_proba, 4),
            "triggered_keywords": triggered,
            "reasons":            reasons,
        }

    def _find_triggered_keywords(self, message: str) -> List[str]:
        lower = message.lower()
        return [kw for kw in SMS_PHISHING_KEYWORDS if kw in lower]

    def _build_sms_reasons(
        self,
        prediction: int,
        confidence: float,
        triggered: List[str]
    ) -> List[str]:
        reasons = []
        if prediction == 1:
            reasons.append(
                f"NLP model classified this message as phishing/spam "
                f"(confidence: {confidence*100:.1f}%)"
            )
            if triggered:
                reasons.append(
                    f"Message contains high-risk keywords: {', '.join(triggered)}"
                )
            if not triggered:
                reasons.append(
                    "Sentence structure and word patterns match known phishing templates"
                )
        else:
            reasons.append(
                f"NLP model classified this message as legitimate "
                f"(confidence: {confidence*100:.1f}%)"
            )
            if triggered:
                reasons.append(
                    f"Some alert keywords detected ({', '.join(triggered)}) "
                    f"but overall context appears benign"
                )
        return reasons

    # ── Status ────────────────────────────────────────────────────────────────

    def status(self) -> Dict[str, Any]:
        return {
            "loaded":     self._loaded,
            "url_model":  type(self.url_model).__name__ if self.url_model is not None else "not loaded",
            "sms_model":  type(self.sms_model).__name__ if self.sms_model is not None else "not loaded",
            "url_features": len(self.url_feature_cols),
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
ml_engine = MLEngine()