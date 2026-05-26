class MlFeature {
  final String feature;
  final int value;
  final double importance;
  final String riskContribution;
  final bool flagged;

  MlFeature({
    required this.feature,
    required this.value,
    required this.importance,
    required this.riskContribution,
    required this.flagged,
  });

  factory MlFeature.fromJson(Map<String, dynamic> json) {
    return MlFeature(
      feature: json['feature'] ?? '',
      value: (json['value'] ?? 0).toInt(),
      importance: (json['importance'] ?? 0.0).toDouble(),
      riskContribution: json['risk_contribution'] ?? 'none',
      flagged: json['flagged'] ?? false,
    );
  }
}

class MlResult {
  final String? prediction; // 'legitimate' | 'phishing'
  final double? confidence;
  final List<MlFeature> topFeatures;

  MlResult({
    this.prediction,
    this.confidence,
    required this.topFeatures,
  });

  factory MlResult.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return MlResult(topFeatures: []);
    }

    final features = (json['top_features'] as List<dynamic>?)
        ?.map((f) => MlFeature.fromJson(f as Map<String, dynamic>))
        .toList() ?? [];

    return MlResult(
      prediction: json['prediction'] as String?,
      confidence: (json['confidence'] as num?)?.toDouble(),
      topFeatures: features,
    );
  }
}

class ScanResult {
  final String input; // URL, SMS text, or QR content
  final String scanType; // 'url' | 'sms' | 'qr' | 'app'
  final String threatLevel; // 'safe' | 'suspicious' | 'dangerous'
  final double confidence;
  final bool isPhishing;
  final List<String> reasons;
  final Map<String, dynamic>? virustotal;
  final MlResult? mlResult;
  final bool safeBrowsingFlagged;
  final double? scanTimeMs;
  final DateTime scannedAt;

  ScanResult({
    required this.input,
    required this.scanType,
    required this.threatLevel,
    required this.confidence,
    required this.isPhishing,
    required this.reasons,
    this.virustotal,
    this.mlResult,
    this.safeBrowsingFlagged = false,
    this.scanTimeMs,
    DateTime? scannedAt,
  }) : scannedAt = scannedAt ?? DateTime.now();

  factory ScanResult.fromJson(Map<String, dynamic> json, {
    required String input,
    required String scanType,
  }) {
    return ScanResult(
      input: json['url'] ?? json['text'] ?? json['message'] ?? json['decoded_url'] ?? input,
      scanType: scanType,
      threatLevel: json['threat_level'] ?? 'safe',
      confidence: (json['confidence'] ?? 0.0).toDouble(),
      isPhishing: json['is_phishing'] ?? false,
      reasons: List<String>.from(json['reasons'] ?? []),
      virustotal: json['virustotal'],
      mlResult: json['ml_result'] != null
          ? MlResult.fromJson(json['ml_result'] as Map<String, dynamic>)
          : null,
      safeBrowsingFlagged: json['safe_browsing_flagged'] ?? false,
      scanTimeMs: (json['scan_time_ms'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'input': input,
    'scan_type': scanType,
    'threat_level': threatLevel,
    'confidence': confidence,
    'is_phishing': isPhishing,
    'reasons': reasons,
    'virustotal': virustotal,
    'ml_result': mlResult,
    'safe_browsing_flagged': safeBrowsingFlagged,
    'scan_time_ms': scanTimeMs,
    'scanned_at': scannedAt.toIso8601String(),
  };

  bool get isSafe => threatLevel == 'safe';
  bool get isSuspicious => threatLevel == 'suspicious';
  bool get isDangerous => threatLevel == 'dangerous';
}
