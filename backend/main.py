"""
main.py
FastAPI application entry point.

Run with:
  uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ─── ML Engine ────────────────────────────────────────────────────────────────
from backend.ml_engine import ml_engine

# ─── Firebase Service ─────────────────────────────────────────────────────────────
from backend.firebase_service import firebase_service

# ─── Routes ───────────────────────────────────────────────────────────────────
from backend.routes.scan     import router as scan_router
from backend.routes.analyze  import router as analyze_router
from backend.routes.history  import router as history_router
from backend.routes.report   import router as report_router


# ─── Lifespan (startup / shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models and initialize Firebase on startup; shutdown resources."""
    logger.info("🚀 Starting Phishing & Malware Detection API …")
    
    # Load ML Models
    try:
        ml_engine.load_models()
        status = ml_engine.status()
        logger.info(
            f"✅ Models loaded — URL: {status['url_model']} | "
            f"SMS: {status['sms_model']} | "
            f"Features: {status['url_features']}"
        )
    except RuntimeError as e:
        logger.error(f"❌ Model loading failed: {e}")
        # App still starts so /docs is accessible; scan endpoints return 503

    # Initialize Firebase
    if firebase_service.is_initialized():
        logger.info("✅ Firebase initialized and ready for Firestore operations")
    else:
        logger.warning(
            "⚠️  Firebase not initialized. Scan results will not be saved to Firestore. "
            "Set FIREBASE_CREDENTIALS_PATH environment variable."
        )
    
    yield
    logger.info("🛑 Shutting down …")


# ─── App factory ──────────────────────────────────────────────────────────────

app = FastAPI(
    title       ="Phishing & Malware Detection API",
    description =(
        "Full-stack AI-powered phishing and malware detection backend.\n\n"
        "**Models:** Random Forest (97.11%), XGBoost (96.79%), TF-IDF + LR SMS (97.58%)\n\n"
        "**Integrations:** VirusTotal v3, Google Safe Browsing v4"
    ),
    version     ="1.0.0",
    docs_url    ="/docs",
    redoc_url   ="/redoc",
    lifespan    =lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Restrict origins in production — wildcard is fine for local dev / Flutter mobile

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "*",          # dev default; set comma-separated list in .env for production
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins    =ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods    =["*"],
    allow_headers    =["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(scan_router,    prefix="/api/v1")
app.include_router(analyze_router, prefix="/api/v1")
app.include_router(history_router, prefix="/api/v1")
app.include_router(report_router,  prefix="/api/v1")


# ─── Root & Health ────────────────────────────────────────────────────────────

PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "https://rohanv56-phishing-detection-api.hf.space")

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Phishing & Malware Detection API is running",
        "docs":    f"{PUBLIC_API_URL}/docs",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health():
    status = ml_engine.status()
    return JSONResponse(
        status_code=200,
        content={
            "status":            "ok" if status["loaded"] else "degraded",
            "ml_models_loaded":  status["loaded"],
            "url_model":         status["url_model"],
            "sms_model":         status["sms_model"],
            "url_feature_count": status["url_features"],
            "version":           "1.0.0",
        },
    )