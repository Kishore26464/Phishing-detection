import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/constants.dart';
import '../services/api_service.dart';
import '../services/firebase_service.dart';
import '../models/scan_result.dart';
import '../widgets/threat_result_card.dart';

class UrlScannerScreen extends StatefulWidget {
  const UrlScannerScreen({super.key});

  @override
  State<UrlScannerScreen> createState() => _UrlScannerScreenState();
}

class _UrlScannerScreenState extends State<UrlScannerScreen> {
  final _controller = TextEditingController();
  final _api        = ApiService();
  final _firebase   = FirebaseService();

  bool _loading  = false;
  ScanResult? _result;
  String? _error;

  Future<void> _scan() async {
    final url = _controller.text.trim();
    if (url.isEmpty) {
      setState(() => _error = 'Please enter a URL');
      return;
    }
    setState(() { _loading = true; _error = null; _result = null; });

    try {
      final result = await _api.scanUrl(url);
      await _firebase.saveScanResult(result);
      if (mounted) setState(() { _result = result; _loading = false; });
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _paste() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text != null) {
      _controller.text = data!.text!;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('URL Scanner', style: AppTextStyles.heading2),
        centerTitle: false,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info card
            _InfoBanner(
              icon: Icons.info_outline_rounded,
              text: 'Paste any URL to analyze it for phishing, malware, and other threats.',
            ),
            const SizedBox(height: 24),

            Text('ENTER URL', style: AppTextStyles.label),
            const SizedBox(height: 8),

            // URL input
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  TextField(
                    controller: _controller,
                    style: AppTextStyles.mono.copyWith(
                        color: AppColors.textPrimary, fontSize: 14),
                    maxLines: 4,
                    minLines: 3,
                    keyboardType: TextInputType.url,
                    decoration: InputDecoration(
                      hintText: 'https://example.com',
                      hintStyle: TextStyle(
                          color: AppColors.textMuted, fontFamily: 'monospace'),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                  Divider(color: AppColors.border, height: 1),
                  Row(
                    children: [
                      TextButton.icon(
                        onPressed: _paste,
                        icon: const Icon(Icons.content_paste_rounded,
                            size: 16, color: AppColors.primary),
                        label: const Text('Paste',
                            style: TextStyle(color: AppColors.primary, fontSize: 13)),
                      ),
                      TextButton.icon(
                        onPressed: () => _controller.clear(),
                        icon: const Icon(Icons.clear_rounded,
                            size: 16, color: AppColors.textMuted),
                        label: Text('Clear',
                            style: TextStyle(
                                color: AppColors.textMuted, fontSize: 13)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            if (_error != null)
              _ErrorBanner(message: _error!),

            const SizedBox(height: 8),

            // Scan button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _loading ? null : _scan,
                icon: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: Colors.black),
                      )
                    : const Icon(Icons.radar_rounded),
                label: Text(
                  _loading ? 'Analyzing...' : 'Scan URL',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
              ),
            ),

            const SizedBox(height: 24),

            if (_loading)
              _ScanningAnimation(),

            if (_result != null) ...[
              Text('SCAN RESULT', style: AppTextStyles.label),
              const SizedBox(height: 8),
              ThreatResultCard(result: _result!),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoBanner({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primaryGlow,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.primary, size: 18),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: AppTextStyles.body.copyWith(fontSize: 13))),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.dangerGlow,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.danger.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style: AppTextStyles.body.copyWith(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }
}

class _ScanningAnimation extends StatefulWidget {
  @override
  State<_ScanningAnimation> createState() => _ScanningAnimationState();
}

class _ScanningAnimationState extends State<_ScanningAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(seconds: 2))
      ..repeat();
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        children: [
          AnimatedBuilder(
            animation: _anim,
            builder: (_, __) => Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                    color: AppColors.primary.withOpacity(1 - _anim.value),
                    width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary
                        .withOpacity(0.3 * (1 - _anim.value)),
                    blurRadius: 20 * _anim.value,
                    spreadRadius: 10 * _anim.value,
                  ),
                ],
              ),
              child: const Icon(Icons.security_rounded,
                  color: AppColors.primary, size: 36),
            ),
          ),
          const SizedBox(height: 12),
          Text('Scanning for threats...',
              style: AppTextStyles.body.copyWith(color: AppColors.primary)),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
