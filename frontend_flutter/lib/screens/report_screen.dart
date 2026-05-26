import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../services/api_service.dart';
import '../services/firebase_service.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final _urlCtrl     = TextEditingController();
  final _detailsCtrl = TextEditingController();
  final _api         = ApiService();
  final _firebase    = FirebaseService();

  String _selectedReason = 'Phishing';
  bool _loading = false;
  bool _success = false;
  String? _error;

  final _reasons = [
    'Phishing',
    'Malware / Virus',
    'Fake Login Page',
    'Scam / Fraud',
    'Suspicious QR Code',
    'Spam SMS',
    'Other',
  ];

  Future<void> _submit() async {
    final url = _urlCtrl.text.trim();
    if (url.isEmpty) {
      setState(() => _error = 'Please enter the URL or content to report');
      return;
    }
    setState(() { _loading = true; _error = null; });

    try {
      await _api.reportThreat(
        url: url,
        reason: _selectedReason,
        details: _detailsCtrl.text,
      );
      await _firebase.saveReport(
        url: url,
        reason: _selectedReason,
        details: _detailsCtrl.text,
      );
      if (mounted) setState(() { _success = true; _loading = false; });
      _urlCtrl.clear();
      _detailsCtrl.clear();
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    _detailsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('Report Threat', style: AppTextStyles.heading2),
        centerTitle: false,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.dangerGlow,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.danger.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.flag_rounded,
                      color: AppColors.danger, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Report a Threat',
                            style: AppTextStyles.heading2
                                .copyWith(color: AppColors.danger)),
                        const SizedBox(height: 4),
                        Text(
                          'Help protect the community by reporting phishing, malware, or scam URLs.',
                          style: AppTextStyles.body.copyWith(fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            if (_success)
              Container(
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: AppColors.safeGlow,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.safe.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded,
                        color: AppColors.safe, size: 20),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Thank you! Your report has been submitted.',
                        style: TextStyle(
                            color: AppColors.safe,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),

            // URL input
            Text('SUSPICIOUS URL / CONTENT', style: AppTextStyles.label),
            const SizedBox(height: 8),
            TextField(
              controller: _urlCtrl,
              style: AppTextStyles.mono.copyWith(
                  color: AppColors.textPrimary, fontSize: 13),
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'https://suspicious-site.com',
                hintStyle: TextStyle(
                    color: AppColors.textMuted, fontFamily: 'monospace'),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                      color: AppColors.danger, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Reason picker
            Text('THREAT TYPE', style: AppTextStyles.label),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _reasons.map((r) {
                final selected = _selectedReason == r;
                return GestureDetector(
                  onTap: () => setState(() => _selectedReason = r),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.danger.withOpacity(0.15)
                          : AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: selected
                            ? AppColors.danger.withOpacity(0.6)
                            : AppColors.border,
                      ),
                    ),
                    child: Text(r,
                        style: TextStyle(
                          color: selected
                              ? AppColors.danger
                              : AppColors.textSecondary,
                          fontSize: 13,
                          fontWeight: selected
                              ? FontWeight.w600
                              : FontWeight.w400,
                        )),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // Details
            Text('ADDITIONAL DETAILS (OPTIONAL)', style: AppTextStyles.label),
            const SizedBox(height: 8),
            TextField(
              controller: _detailsCtrl,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Describe what you observed...',
                hintStyle: TextStyle(color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                      color: AppColors.primary, width: 1.5),
                ),
              ),
            ),

            const SizedBox(height: 16),
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: AppColors.dangerGlow,
                  borderRadius: BorderRadius.circular(8),
                  border:
                      Border.all(color: AppColors.danger.withOpacity(0.4)),
                ),
                child: Text(_error!,
                    style: AppTextStyles.body
                        .copyWith(color: AppColors.danger)),
              ),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _loading ? null : _submit,
                icon: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: Colors.white),
                      )
                    : const Icon(Icons.flag_rounded),
                label: Text(
                  _loading ? 'Submitting...' : 'Submit Report',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.danger,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
