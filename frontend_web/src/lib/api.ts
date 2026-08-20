import { extractUrlFeatures } from './urlFeatures';
import type {
  AppAnalysisResponse,
  QRScanResponse,
  ReportThreatRequest,
  ReportThreatResponse,
  SMSScanResponse,
  URLScanResponse,
} from './types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://rohanv56-phishing-api.hf.space/api/v1';

const REQUEST_TIMEOUT_MS = 30_000;

async function request<T>(path: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const detail = data?.detail ?? `Server error ${res.status}`;
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function scanUrl(url: string, userId?: string | null) {
  const features = extractUrlFeatures(url);
  return request<URLScanResponse>('/scan-url', { url, features, user_id: userId ?? undefined });
}

export function scanSms(message: string, userId?: string | null) {
  return request<SMSScanResponse>('/scan-sms', { message, user_id: userId ?? undefined });
}

export function scanQr(decodedUrl: string, userId?: string | null) {
  return request<QRScanResponse>('/scan-qr', { decoded_url: decodedUrl, user_id: userId ?? undefined });
}

export function analyzeApp(appName: string, permissions: string[]) {
  return request<AppAnalysisResponse>('/analyze-app', { app_name: appName, permissions });
}

export function reportThreat(payload: ReportThreatRequest) {
  return request<ReportThreatResponse>('/report-threat', payload);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL.replace(/\/api\/v1$/, '')}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
