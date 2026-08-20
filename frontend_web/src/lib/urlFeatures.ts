/**
 * Extracts the same 30 binary features the Flutter app computes client-side
 * before calling POST /scan-url, so URL verdicts are consistent across
 * mobile and web. Ported from frontend_flutter/lib/services/url_feature_extractor.dart.
 */

const KNOWN_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  't.co',
  'is.gd',
  'tiny.cc',
]);

const PHISHING_KEYWORDS = [
  'secure',
  'verify',
  'account',
  'update',
  'banking',
  'paypal',
  'amazon',
  'apple',
  'microsoft',
  'login',
  'signin',
  'confirm',
  'credential',
  'wallet',
  'otp',
  'kyc',
  'reward',
  'prize',
  'winner',
];

const RISKY_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.click', '.pw', '.cc'];

export type UrlFeatures = Record<string, number>;

function defaultFeatures(): UrlFeatures {
  return {
    UsingIP: 0,
    LongURL: 0,
    ShortURL: 0,
    'Symbol@': 0,
    'Redirecting//': 0,
    'PrefixSuffix-': 0,
    SubDomains: 0,
    HTTPS: 0,
    DomainRegLen: 0,
    Favicon: 0,
    NonStdPort: 0,
    HTTPSDomainURL: 0,
    RequestURL: 0,
    AnchorURL: 0,
    LinksInScriptTags: 0,
    ServerFormHandler: 0,
    InfoEmail: 0,
    AbnormalURL: 0,
    WebsiteForwarding: 0,
    StatusBarCust: 0,
    DisableRightClick: 0,
    UsingPopupWindow: 0,
    IframeRedirection: 0,
    AgeofDomain: 0,
    DNSRecording: 0,
    WebsiteTraffic: 0,
    PageRank: 0,
    GoogleIndex: 0,
    LinksPointingToPage: 0,
    StatsReport: 0,
  };
}

function isIpAddress(hostname: string): boolean {
  return /^(\d+\.){3}\d+$/.test(hostname);
}

function hasDoubleSlash(url: string): boolean {
  const idx = url.indexOf('://');
  if (idx === -1) return url.includes('//');
  const afterProtocol = url.slice(idx + 3);
  return afterProtocol.includes('//');
}

function checkDomainLen(hostname: string): boolean {
  const domain = hostname.split('.')[0] ?? '';
  if (/\d{4,}/.test(domain)) return true;
  if (domain.replace(/\d/g, '').length < 4) return true;
  return false;
}

function hasSuspiciousPath(path: string): boolean {
  const keywords = ['login', 'signin', 'submit', 'verify', 'update', 'confirm', 'secure'];
  return keywords.some((kw) => path.includes(kw));
}

function hasEmailInfo(url: string): boolean {
  return url.includes('mailto:') || url.includes('@gmail') || url.includes('@yahoo');
}

function hasRedirectKeywords(url: string): boolean {
  return url.includes('redirect') || url.includes('forward') || url.includes('goto');
}

function hasRiskyTld(hostname: string): boolean {
  return RISKY_TLDS.some((tld) => hostname.endsWith(tld));
}

function countPhishingKeywords(url: string): number {
  return PHISHING_KEYWORDS.reduce((count, kw) => (url.includes(kw) ? count + 1 : count), 0);
}

export function extractUrlFeatures(rawUrl: string): UrlFeatures {
  try {
    let urlString = rawUrl.trim();
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = `http://${urlString}`;
    }

    let uri: URL;
    try {
      uri = new URL(urlString);
    } catch {
      return defaultFeatures();
    }

    const features: UrlFeatures = {};

    const scheme = uri.protocol.replace(':', '');
    const hostname = uri.hostname.toLowerCase();
    const port = uri.port ? parseInt(uri.port, 10) : -1;
    const path = uri.pathname.toLowerCase();
    const fullUrl = urlString.toLowerCase();
    const fragment = uri.hash.replace('#', '');

    features.UsingIP = isIpAddress(hostname) ? 1 : 0;
    features.LongURL = urlString.length > 75 ? 1 : 0;
    features.ShortURL = KNOWN_SHORTENERS.has(hostname) ? 1 : 0;
    features['Symbol@'] = fullUrl.includes('@') ? 1 : 0;
    features['Redirecting//'] = hasDoubleSlash(fullUrl) ? 1 : 0;
    features['PrefixSuffix-'] = hostname.includes('-') ? 1 : 0;
    features.SubDomains = hostname.split('.').length > 2 ? 1 : 0;
    features.HTTPS = scheme !== 'https' ? 1 : 0;
    features.DomainRegLen = checkDomainLen(hostname) ? 1 : 0;
    features.Favicon = 0;
    features.NonStdPort = port !== -1 && ![80, 443, 8080, 8443].includes(port) ? 1 : 0;
    features.HTTPSDomainURL = hostname.includes('https') ? 1 : 0;
    features.RequestURL = (fullUrl.match(/https?:\/\//g)?.length ?? 0) > 1 ? 1 : 0;
    features.AnchorURL = fragment.length > 10 ? 1 : 0;
    features.LinksInScriptTags = 0;
    features.ServerFormHandler = hasSuspiciousPath(path) ? 1 : 0;
    features.InfoEmail = hasEmailInfo(fullUrl) ? 1 : 0;
    features.AbnormalURL = !fullUrl.includes(hostname) ? 1 : 0;
    features.WebsiteForwarding = hasRedirectKeywords(fullUrl) ? 1 : 0;
    features.StatusBarCust = fullUrl.includes('javascript:') ? 1 : 0;
    features.DisableRightClick = 0;
    features.UsingPopupWindow = 0;
    features.IframeRedirection = 0;
    features.AgeofDomain = hasRiskyTld(hostname) ? 1 : 0;
    features.DNSRecording = features.UsingIP;
    features.WebsiteTraffic = urlString.length > 150 ? 1 : 0;
    features.PageRank = features.HTTPS === 1 || features.AgeofDomain === 1 ? 1 : 0;
    features.GoogleIndex = features.UsingIP === 1 || features.AgeofDomain === 1 ? 1 : 0;
    features.LinksPointingToPage = 0;
    features.StatsReport = countPhishingKeywords(fullUrl) >= 2 ? 1 : 0;

    return features;
  } catch {
    return defaultFeatures();
  }
}
