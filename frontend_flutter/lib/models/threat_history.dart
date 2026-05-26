class ThreatHistoryItem {
  final String id;
  final String input;
  final String scanType;
  final String threatLevel;
  final double confidence;
  final bool isPhishing;
  final List<String> reasons;
  final DateTime scannedAt;

  ThreatHistoryItem({
    required this.id,
    required this.input,
    required this.scanType,
    required this.threatLevel,
    required this.confidence,
    required this.isPhishing,
    required this.reasons,
    required this.scannedAt,
  });

  factory ThreatHistoryItem.fromJson(Map<String, dynamic> json) {
    return ThreatHistoryItem(
      id: json['id'] ?? '',
      input: json['input'] ?? json['url'] ?? json['text'] ?? '',
      scanType: json['scan_type'] ?? 'url',
      threatLevel: json['threat_level'] ?? 'safe',
      confidence: (json['confidence'] ?? 0.0).toDouble(),
      isPhishing: json['is_phishing'] ?? false,
      reasons: List<String>.from(json['reasons'] ?? []),
      scannedAt: json['scanned_at'] != null
          ? DateTime.tryParse(json['scanned_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  factory ThreatHistoryItem.fromFirestore(Map<String, dynamic> data, String docId) {
    return ThreatHistoryItem(
      id: docId,
      input: data['input'] ?? '',
      scanType: data['scan_type'] ?? 'url',
      threatLevel: data['threat_level'] ?? 'safe',
      confidence: (data['confidence'] ?? 0.0).toDouble(),
      isPhishing: data['is_phishing'] ?? false,
      reasons: List<String>.from(data['reasons'] ?? []),
      scannedAt: data['scanned_at'] != null
          ? (data['scanned_at'] as dynamic).toDate()
          : DateTime.now(),
    );
  }

  String get displayInput {
    if (input.length > 50) return '${input.substring(0, 47)}...';
    return input;
  }

  String get scanTypeLabel {
    switch (scanType) {
      case 'url':  return 'URL';
      case 'sms':  return 'SMS';
      case 'qr':   return 'QR';
      case 'app':  return 'APP';
      default:     return scanType.toUpperCase();
    }
  }
}
