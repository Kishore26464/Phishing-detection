import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/constants.dart';
import '../services/api_service.dart';
import '../services/firebase_service.dart';
import '../models/scan_result.dart';
import '../widgets/threat_result_card.dart';

class SmsScannerScreen extends StatefulWidget {
  const SmsScannerScreen({super.key});

  @override
  State<SmsScannerScreen> createState() => _SmsScannerScreenState();
}

class _SmsScannerScreenState extends State<SmsScannerScreen> {
  final _controller = TextEditingController();
  final _api        = ApiService();
  final _firebase   = FirebaseService();

  bool _loading = false;
  ScanResult? _result;
  String? _error;

  Future<void> _scan() async {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Please paste an SMS message');
      return;
    }
    setState(() { _loading = true; _error = null; _result = null; });
    try {
      final result = await _api.scanSms(text);
      await _firebase.saveScanResult(result);
      if (mounted) setState(() { _result = result; _loading = false; });
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _loading = false;
      });
    }
  }

  final _examples = [
    'URGENT: Your bank account has been suspended. Click here to verify: http://secure-bank-login.xyz',
    'Congratulations! You won Rs.50,000. Claim now: bit.ly/win-now',
    'Your OTP is 123456. Do not share with anyone.',
    'Dear customer, your KYC is pending. Update now or your account will be blocked.',
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _InfoBanner({required IconData icon, required String text}) {
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

  Widget _ErrorBanner({required String message}) {
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('SMS Scanner', style: AppTextStyles.heading2),
        centerTitle: false,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _InfoBanner(
              icon: Icons.sms_outlined,
              text: 'Paste any suspicious SMS to detect OTP scams, fake bank alerts, and phishing links.',
            ),
            const SizedBox(height: 24),

            Text('SMS / MESSAGE TEXT', style: AppTextStyles.label),
            const SizedBox(height: 8),

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
                    style: const TextStyle(
                        color: AppColors.textPrimary, fontSize: 14, height: 1.5),
                    maxLines: 6,
                    minLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Paste SMS message here...',
                      hintStyle: TextStyle(color: AppColors.textMuted),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                  Divider(color: AppColors.border, height: 1),
                  Row(
                    children: [
                      TextButton.icon(
                        onPressed: () async {
                          final d = await Clipboard.getData(Clipboard.kTextPlain);
                          if (d?.text != null) _controller.text = d!.text!;
                        },
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

            const SizedBox(height: 14),

            // Example chips
            Text('TRY AN EXAMPLE', style: AppTextStyles.label),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _examples.map((ex) => GestureDetector(
                onTap: () => _controller.text = ex,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    ex.length > 30 ? '${ex.substring(0, 30)}...' : ex,
                    style: AppTextStyles.body.copyWith(fontSize: 11),
                  ),
                ),
              )).toList(),
            ),

            const SizedBox(height: 16),
            if (_error != null) _ErrorBanner(message: _error!),
            const SizedBox(height: 8),

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
                    : const Icon(Icons.sms_rounded),
                label: Text(
                  _loading ? 'Analyzing...' : 'Scan Message',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.warning,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
              ),
            ),

            const SizedBox(height: 24),

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
