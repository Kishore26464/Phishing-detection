import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/scan_result.dart';
import '../models/threat_history.dart';
import 'url_feature_extractor.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final _client = http.Client();

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // ─── URL Scan ─────────────────────────────────────────────────────────────
  Future<ScanResult> scanUrl(String url) async {
    // Extract all 30 features from URL
    final features = UrlFeatureExtractor.extractFeatures(url);
    
    final response = await _client
        .post(
          Uri.parse('${AppConfig.baseUrl}/scan-url'),
          headers: _headers,
          body: jsonEncode({
            'url': url,
            'features': features,
          }),
        )
        .timeout(AppConfig.requestTimeout);

    _checkStatus(response);
    final data = jsonDecode(response.body);
    return ScanResult.fromJson(data, input: url, scanType: 'url');
  }

  // ─── SMS Scan ─────────────────────────────────────────────────────────────
  Future<ScanResult> scanSms(String text) async {
    final response = await _client
        .post(
          Uri.parse('${AppConfig.baseUrl}/scan-sms'),
          headers: _headers,
          body: jsonEncode({'message': text}),
        )
        .timeout(AppConfig.requestTimeout);

    _checkStatus(response);
    final data = jsonDecode(response.body);
    return ScanResult.fromJson(data, input: text, scanType: 'sms');
  }

  // ─── QR Scan ──────────────────────────────────────────────────────────────
  Future<ScanResult> scanQr(String url) async {
    final response = await _client
        .post(
          Uri.parse('${AppConfig.baseUrl}/scan-qr'),
          headers: _headers,
          body: jsonEncode({'decoded_url': url}),
        )
        .timeout(AppConfig.requestTimeout);

    _checkStatus(response);
    final data = jsonDecode(response.body);
    return ScanResult.fromJson(data, input: url, scanType: 'qr');
  }

  // ─── App Analyze ──────────────────────────────────────────────────────────
  Future<ScanResult> analyzeApp(List<String> permissions) async {
    final response = await _client
        .post(
          Uri.parse('${AppConfig.baseUrl}/analyze-app'),
          headers: _headers,
          body: jsonEncode({'permissions': permissions}),
        )
        .timeout(AppConfig.requestTimeout);

    _checkStatus(response);
    final data = jsonDecode(response.body);
    return ScanResult.fromJson(data, input: permissions.join(', '), scanType: 'app');
  }

  // ─── Threat History ───────────────────────────────────────────────────────
  Future<List<ThreatHistoryItem>> getThreatHistory() async {
    final response = await _client
        .get(
          Uri.parse('${AppConfig.baseUrl}/threat-history'),
          headers: _headers,
        )
        .timeout(AppConfig.requestTimeout);

    _checkStatus(response);
    final data = jsonDecode(response.body);
    final List<dynamic> items = data['history'] ?? data ?? [];
    return items
        .map((item) => ThreatHistoryItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  // ─── Report Threat ────────────────────────────────────────────────────────
  Future<bool> reportThreat({
    required String url,
    required String reason,
    String? details,
  }) async {
    final response = await _client
        .post(
          Uri.parse('${AppConfig.baseUrl}/report-threat'),
          headers: _headers,
          body: jsonEncode({
            'url': url,
            'type': 'phishing',
            'source': 'flutter_app',
          }),
        )
        .timeout(AppConfig.requestTimeout);

    return response.statusCode == 200;
  }

  // ─── Health Check ─────────────────────────────────────────────────────────
  Future<bool> checkHealth() async {
    try {
      final response = await _client
          .get(Uri.parse('${AppConfig.baseUrl}/'))
          .timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  void _checkStatus(http.Response response) {
    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['detail'] ?? 'Server error ${response.statusCode}');
    }
  }

  void dispose() => _client.close();
}
