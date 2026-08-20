export type ThreatLevel = 'safe' | 'suspicious' | 'dangerous' | 'unknown';

export type ScanType = 'url' | 'sms' | 'qr' | 'app';

export interface MLURLResult {
  prediction: string;
  confidence: number;
  top_features: Array<Record<string, unknown>>;
}

export interface VirusTotalResult {
  malicious_votes: number;
  suspicious_votes: number;
  total_engines: number;
  categories: string[];
  permalink?: string | null;
  error?: string | null;
}

export interface URLScanResponse {
  url: string;
  threat_level: ThreatLevel;
  confidence: number;
  is_phishing: boolean;
  reasons: string[];
  ml_result: MLURLResult;
  virustotal?: VirusTotalResult | null;
  safe_browsing_flagged: boolean;
  scan_time_ms: number;
}

export interface SMSScanResponse {
  message: string;
  threat_level: ThreatLevel;
  confidence: number;
  is_phishing: boolean;
  reasons: string[];
  triggered_keywords: string[];
  scan_time_ms: number;
}

export interface QRScanResponse {
  decoded_url: string;
  threat_level: ThreatLevel;
  confidence: number;
  is_phishing: boolean;
  reasons: string[];
  url_scan: URLScanResponse;
  scan_time_ms: number;
}

export interface PermissionRisk {
  permission: string;
  risk_level: 'high' | 'medium' | 'low';
  reason: string;
}

export interface AppAnalysisResponse {
  app_name: string;
  threat_level: ThreatLevel;
  confidence: number;
  risk_score: number;
  dangerous_permissions: PermissionRisk[];
  reasons: string[];
  recommendation: string;
  scan_time_ms: number;
}

export interface ReportThreatRequest {
  scan_type: ScanType;
  input_data: string;
  threat_level: ThreatLevel;
  user_comment?: string;
  reporter_email?: string;
  user_id?: string;
}

export interface ReportThreatResponse {
  report_id: string;
  status: string;
  message: string;
  persisted: boolean;
}

export interface ThreatHistoryEntry {
  id: string;
  scan_type: ScanType;
  input_data: string;
  threat_level: ThreatLevel;
  confidence: number;
  timestamp: string;
  reasons: string[];
}

export interface ThreatHistoryResponse {
  entries: ThreatHistoryEntry[];
  total: number;
  page: number;
  page_size: number;
}

/** Normalized shape used to render the Result Detail forensics view,
 *  regardless of whether the data came fresh from the API or from a
 *  stored Firestore scan record. */
export interface ScanRecord {
  id?: string;
  type: ScanType;
  input: string;
  threatLevel: ThreatLevel;
  confidence: number;
  isPhishing: boolean;
  reasons: string[];
  triggeredKeywords?: string[];
  mlResult?: { prediction?: string; confidence?: number; top_features?: Array<Record<string, unknown>> };
  virusTotalResult?: Partial<VirusTotalResult> | null;
  safeBrowsingFlagged?: boolean;
  scanTimeMs?: number;
  timestamp?: number | null;
}
