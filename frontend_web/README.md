# PhishGuard Web — Signal Forensics Console

A React + TypeScript + Tailwind CSS web app for the PhishGuard phishing/SMS/QR
detection platform, built against the same FastAPI backend and Firebase
project (`phishguard-38c10`) as the Flutter mobile app. Visual design follows
the "Signal Forensics" system (Void/Ink/Steel palette, JetBrains Mono + Inter,
the signature pulse-line waveform on every card).

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (tokens defined in `src/index.css` via `@theme`)
- React Router v7
- Firebase (Auth — Google Sign-In, Firestore — scan history/stats)
- `jsqr` for client-side QR decoding (camera + image upload)

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` to point at a different backend if needed
(defaults to the deployed Hugging Face Space, same as the mobile app):

```
VITE_API_BASE_URL=https://rohanv56-phishing-api.hf.space/api/v1
```

## Architecture notes

- **Auth**: Google Sign-In via Firebase Auth (`src/context/AuthContext.tsx`).
  `ProtectedRoute` gates every page except `/login`.
- **Scanning**: `src/lib/api.ts` calls the FastAPI backend's
  `/scan-url`, `/scan-sms`, `/scan-qr`, `/analyze-app`, and `/report-threat`
  endpoints. `src/lib/urlFeatures.ts` is a byte-for-byte TypeScript port of
  the Flutter app's client-side 30-feature URL extractor, so ML verdicts
  match across platforms.
- **Persistence**: passing the signed-in user's `uid` to the scan endpoints
  makes the backend write results to Firestore under
  `users/{uid}/scans/{scanId}` (see `backend/firebase_service.py`). The web
  app reads that same subcollection directly via the Firestore client SDK
  (`src/lib/firestoreScans.ts`) for the Dashboard, History, and Analytics
  pages — it does not duplicate the write, avoiding the write races the
  Flutter client can otherwise cause.
- **Pages**: Dashboard, Scan URL/SMS/QR, Bulk Scan, History, Result Detail
  (forensics view), Analytics, Report, Settings — mirroring the attached
  Stitch "Signal Forensics" designs.
- **Routing**: uses React Router's `HashRouter` (`#/history`, `#/scan/url`, …)
  rather than `BrowserRouter`. GitHub Pages can't be configured with a
  server-side SPA fallback, so hash-based routing avoids 404s on refresh or
  deep links without extra redirect tricks.

## Deployment (GitHub Pages)

Pushing to `main` with changes under `frontend_web/` triggers
[`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml),
which builds the app and publishes `dist/` to GitHub Pages via
`actions/deploy-pages`. You can also trigger it manually from the Actions tab
(`workflow_dispatch`).

The build sets `VITE_BASE_PATH=/<repo-name>/` so asset URLs resolve correctly
under the project-site subpath (`https://<user>.github.io/<repo>/`). For a
local subpath build: `VITE_BASE_PATH=/Phishing-detection/ npm run build`.

**One-time repo setup required** (can't be done from a commit):
1. **Settings → Pages → Build and deployment → Source**: set to
   **GitHub Actions**. Without this the workflow's deploy step has nothing
   to publish to.
2. **Firebase Console → Authentication → Settings → Authorized domains**:
   add `<user>.github.io` (e.g. `kishore26464.github.io`). Without this,
   `signInWithPopup` for Google Sign-In will fail on the deployed site with
   `auth/unauthorized-domain`.
