import 'package:flutter/foundation.dart';
import 'dart:convert';

/// Extracts 30 binary features from a URL for ML classification.
/// All features are binary (0 or 1) as required by /scan-url endpoint.
class UrlFeatureExtractor {
  static const Set<String> _knownShorteners = {
    'bit.ly',
    'tinyurl.com',
    'goo.gl',
    'ow.ly',
    't.co',
    'is.gd',
    'tiny.cc',
  };

  static const Set<String> _phishingKeywords = {
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
  };

  static const Set<String> _riskeyTlds = {
    '.tk',
    '.ml',
    '.ga',
    '.cf',
    '.gq',
    '.xyz',
    '.top',
    '.click',
    '.pw',
    '.cc',
  };

  /// Extract all 30 features from URL
  static Map<String, int> extractFeatures(String urlString) {
    try {
      // Normalize URL
      urlString = urlString.trim();
      if (!urlString.startsWith(RegExp(r'https?://'))) {
        urlString = 'http://$urlString';
      }

      final uri = Uri.tryParse(urlString);
      if (uri == null) {
        return _defaultFeatures();
      }

      final features = <String, int>{};

      // Extract components
      final scheme = uri.scheme;
      final hostname = uri.host.toLowerCase();
      final port = uri.port;
      final path = uri.path.toLowerCase();
      final fullUrl = urlString.toLowerCase();
      final fragment = uri.fragment;

      // 1. UsingIP: 1 if hostname is raw IPv4
      features['UsingIP'] = _isIpAddress(hostname) ? 1 : 0;

      // 2. LongURL: 1 if URL > 75 chars
      features['LongURL'] = urlString.length > 75 ? 1 : 0;

      // 3. ShortURL: 1 if domain is known shortener
      features['ShortURL'] = _knownShorteners.contains(hostname) ? 1 : 0;

      // 4. Symbol@: 1 if URL contains @
      features['Symbol@'] = fullUrl.contains('@') ? 1 : 0;

      // 5. Redirecting//: 1 if // appears after protocol
      features['Redirecting//'] = _hasDoubleSlash(fullUrl) ? 1 : 0;

      // 6. PrefixSuffix-: 1 if hostname contains hyphen
      features['PrefixSuffix-'] = hostname.contains('-') ? 1 : 0;

      // 7. SubDomains: 1 if hostname has 3+ dots (2+ subdomains)
      features['SubDomains'] = hostname.split('.').length > 2 ? 1 : 0;

      // 8. HTTPS: 1 if scheme is NOT https (risky)
      features['HTTPS'] = scheme != 'https' ? 1 : 0;

      // 9. DomainRegLen: 1 if 4+ consecutive digits or alphabetic part < 4
      features['DomainRegLen'] = _checkDomainLen(hostname) ? 1 : 0;

      // 10. Favicon: 0 (cannot check statically)
      features['Favicon'] = 0;

      // 11. NonStdPort: 1 if port set and not 80/443/8080/8443
      features['NonStdPort'] =
          port != -1 && ![80, 443, 8080, 8443].contains(port) ? 1 : 0;

      // 12. HTTPSDomainURL: 1 if "https" appears inside hostname
      features['HTTPSDomainURL'] = hostname.contains('https') ? 1 : 0;

      // 13. RequestURL: 1 if 2+ http/https patterns in URL
      features['RequestURL'] =
          RegExp(r'https?://').allMatches(fullUrl).length > 1 ? 1 : 0;

      // 14. AnchorURL: 1 if fragment length > 10
      features['AnchorURL'] = fragment.length > 10 ? 1 : 0;

      // 15. LinksInScriptTags: 0 (cannot check statically)
      features['LinksInScriptTags'] = 0;

      // 16. ServerFormHandler: 1 if path contains suspicious keywords
      features['ServerFormHandler'] = _hasSuspiciousPath(path) ? 1 : 0;

      // 17. InfoEmail: 1 if URL contains mailto: or @gmail/@yahoo
      features['InfoEmail'] = _hasEmailInfo(fullUrl) ? 1 : 0;

      // 18. AbnormalURL: 1 if hostname not in full URL
      features['AbnormalURL'] = !fullUrl.contains(hostname) ? 1 : 0;

      // 19. WebsiteForwarding: 1 if URL contains redirect/forward/goto
      features['WebsiteForwarding'] = _hasRedirectKeywords(fullUrl) ? 1 : 0;

      // 20. StatusBarCust: 1 if URL contains javascript:
      features['StatusBarCust'] = fullUrl.contains('javascript:') ? 1 : 0;

      // 21. DisableRightClick: 0 (cannot check statically)
      features['DisableRightClick'] = 0;

      // 22. UsingPopupWindow: 0 (cannot check statically)
      features['UsingPopupWindow'] = 0;

      // 23. IframeRedirection: 0 (cannot check statically)
      features['IframeRedirection'] = 0;

      // 24. AgeofDomain: 1 if TLD is risky
      features['AgeofDomain'] = _hasRiskyTld(hostname) ? 1 : 0;

      // 25. DNSRecording: same as UsingIP
      features['DNSRecording'] = features['UsingIP']!;

      // 26. WebsiteTraffic: 1 if URL > 150 chars
      features['WebsiteTraffic'] = urlString.length > 150 ? 1 : 0;

      // 27. PageRank: 1 if no HTTPS or AgeofDomain is 1
      features['PageRank'] =
          (features['HTTPS'] == 1 || features['AgeofDomain'] == 1) ? 1 : 0;

      // 28. GoogleIndex: 1 if UsingIP or AgeofDomain is 1
      features['GoogleIndex'] =
          (features['UsingIP'] == 1 || features['AgeofDomain'] == 1) ? 1 : 0;

      // 29. LinksPointingToPage: 0 (cannot check statically)
      features['LinksPointingToPage'] = 0;

      // 30. StatsReport: 1 if 2+ phishing keywords
      features['StatsReport'] = _countPhishingKeywords(fullUrl) >= 2 ? 1 : 0;

      return features;
    } catch (e) {
      debugPrint('Error extracting features: $e');
      return _defaultFeatures();
    }
  }

  /// Default features when extraction fails
  static Map<String, int> _defaultFeatures() {
    return {
      'UsingIP': 0,
      'LongURL': 0,
      'ShortURL': 0,
      'Symbol@': 0,
      'Redirecting//': 0,
      'PrefixSuffix-': 0,
      'SubDomains': 0,
      'HTTPS': 0,
      'DomainRegLen': 0,
      'Favicon': 0,
      'NonStdPort': 0,
      'HTTPSDomainURL': 0,
      'RequestURL': 0,
      'AnchorURL': 0,
      'LinksInScriptTags': 0,
      'ServerFormHandler': 0,
      'InfoEmail': 0,
      'AbnormalURL': 0,
      'WebsiteForwarding': 0,
      'StatusBarCust': 0,
      'DisableRightClick': 0,
      'UsingPopupWindow': 0,
      'IframeRedirection': 0,
      'AgeofDomain': 0,
      'DNSRecording': 0,
      'WebsiteTraffic': 0,
      'PageRank': 0,
      'GoogleIndex': 0,
      'LinksPointingToPage': 0,
      'StatsReport': 0,
    };
  }

  /// Check if string is IPv4 address
  static bool _isIpAddress(String hostname) {
    final ipPattern = RegExp(r'^(\d+\.){3}\d+$');
    return ipPattern.hasMatch(hostname);
  }

  /// Check for // outside of protocol
  static bool _hasDoubleSlash(String url) {
    final protocolEnd = url.indexOf('://') + 3;
    final afterProtocol = url.substring(protocolEnd);
    return afterProtocol.contains('//');
  }

  /// Check domain registration length issues
  static bool _checkDomainLen(String hostname) {
    final domain = hostname.split('.').first;
    // 4+ consecutive digits
    if (RegExp(r'\d{4,}').hasMatch(domain)) return true;
    // Alphabetic part < 4 chars
    if (domain.replaceAll(RegExp(r'\d'), '').length < 4) return true;
    return false;
  }

  /// Check for suspicious path keywords
  static bool _hasSuspiciousPath(String path) {
    final keywords = ['login', 'signin', 'submit', 'verify', 'update', 'confirm', 'secure'];
    return keywords.any((kw) => path.contains(kw));
  }

  /// Check for email-related info
  static bool _hasEmailInfo(String url) {
    return url.contains('mailto:') || url.contains('@gmail') || url.contains('@yahoo');
  }

  /// Check for redirect keywords
  static bool _hasRedirectKeywords(String url) {
    return url.contains('redirect') || url.contains('forward') || url.contains('goto');
  }

  /// Check for risky TLD
  static bool _hasRiskyTld(String hostname) {
    return _riskeyTlds.any((tld) => hostname.endsWith(tld));
  }

  /// Count phishing keywords in URL
  static int _countPhishingKeywords(String url) {
    int count = 0;
    for (final keyword in _phishingKeywords) {
      if (url.contains(keyword)) count++;
    }
    return count;
  }
}
