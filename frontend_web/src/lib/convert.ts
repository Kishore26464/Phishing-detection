import type { QRScanResponse, SMSScanResponse, ScanRecord, URLScanResponse } from './types';

export function urlResponseToRecord(response: URLScanResponse): ScanRecord {
  return {
    type: 'url',
    input: response.url,
    threatLevel: response.threat_level,
    confidence: response.confidence,
    isPhishing: response.is_phishing,
    reasons: response.reasons,
    mlResult: response.ml_result,
    virusTotalResult: response.virustotal,
    safeBrowsingFlagged: response.safe_browsing_flagged,
    scanTimeMs: response.scan_time_ms,
    timestamp: Date.now(),
  };
}

export function smsResponseToRecord(response: SMSScanResponse): ScanRecord {
  return {
    type: 'sms',
    input: response.message,
    threatLevel: response.threat_level,
    confidence: response.confidence,
    isPhishing: response.is_phishing,
    reasons: response.reasons,
    triggeredKeywords: response.triggered_keywords,
    scanTimeMs: response.scan_time_ms,
    timestamp: Date.now(),
  };
}

export function qrResponseToRecord(response: QRScanResponse): ScanRecord {
  return {
    type: 'qr',
    input: response.decoded_url,
    threatLevel: response.threat_level,
    confidence: response.confidence,
    isPhishing: response.is_phishing,
    reasons: response.reasons,
    mlResult: response.url_scan?.ml_result,
    virusTotalResult: response.url_scan?.virustotal,
    safeBrowsingFlagged: response.url_scan?.safe_browsing_flagged,
    scanTimeMs: response.scan_time_ms,
    timestamp: Date.now(),
  };
}
