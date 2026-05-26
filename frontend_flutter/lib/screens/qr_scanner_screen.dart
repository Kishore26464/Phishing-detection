import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../config/constants.dart';
import '../services/api_service.dart';
import '../services/firebase_service.dart';
import '../models/scan_result.dart';
import '../widgets/threat_result_card.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  late MobileScannerController _controller;
  final _api        = ApiService();
  final _firebase   = FirebaseService();

  bool _scanning    = true;
  bool _loading     = false;
  ScanResult? _result;
  String? _scannedValue;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Initialize camera controller only when the screen is loaded
    _controller = MobileScannerController();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (!_scanning || _loading) return;
    final barcode = capture.barcodes.firstOrNull;
    final url = barcode?.rawValue;
    if (url == null) return;

    setState(() {
      _scanning = false;
      _loading  = true;
      _scannedValue = url;
      _error = null;
    });
    _controller.stop();

    try {
      final result = await _api.scanQr(url);
      await _firebase.saveScanResult(result);
      if (mounted) setState(() { _result = result; _loading = false; });
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _loading = false;
      });
    }
  }

  void _reset() {
    setState(() {
      _scanning = true;
      _loading  = false;
      _result   = null;
      _scannedValue = null;
      _error    = null;
    });
    _controller.start();
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
        title: const Text('QR Scanner', style: AppTextStyles.heading2),
        centerTitle: false,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.flip_camera_ios_rounded,
                color: AppColors.textSecondary),
            onPressed: _controller.switchCamera,
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Camera viewfinder
            if (_scanning || _loading)
              Stack(
                children: [
                  SizedBox(
                    height: 300,
                    child: _scanning
                        ? MobileScanner(
                            controller: _controller,
                            onDetect: _onDetect,
                          )
                        : Container(color: AppColors.surface),
                  ),
                  // Overlay frame
                  if (_scanning)
                    Positioned.fill(child: _ScannerOverlay()),
                  // Loading overlay
                  if (_loading)
                    Positioned.fill(
                      child: Container(
                        color: Colors.black54,
                        child: const Center(
                          child: CircularProgressIndicator(
                              color: AppColors.primary),
                        ),
                      ),
                    ),
                ],
              ),

            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_scanning)
                    Center(
                      child: Text(
                        'Point camera at a QR code',
                        style: AppTextStyles.body.copyWith(
                            color: AppColors.primary),
                      ),
                    ),

                  if (_scannedValue != null) ...[
                    Text('SCANNED VALUE', style: AppTextStyles.label),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(_scannedValue!,
                          style: AppTextStyles.mono.copyWith(fontSize: 12)),
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (_error != null) _ErrorBanner(message: _error!),

                  if (_result != null) ...[
                    Text('SCAN RESULT', style: AppTextStyles.label),
                    const SizedBox(height: 8),
                    ThreatResultCard(result: _result!),
                    const SizedBox(height: 16),
                  ],

                  if (!_scanning)
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: _reset,
                        icon: const Icon(Icons.qr_code_scanner_rounded),
                        label: const Text('Scan Another QR Code',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.surface,
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScannerOverlay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _OverlayPainter(),
    );
  }
}

class _OverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    const rectSize = 220.0;
    final cx = size.width / 2;
    final cy = size.height / 2;
    final rect = Rect.fromCenter(
        center: Offset(cx, cy), width: rectSize, height: rectSize);

    // Dark overlay with hole
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Offset.zero & size),
        Path()..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(12))),
      ),
      paint,
    );

    // Corner brackets
    final corner = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    const cs = 20.0;
    final corners = [
      [rect.topLeft,     Offset(rect.left + cs, rect.top),    Offset(rect.left, rect.top + cs)],
      [rect.topRight,    Offset(rect.right - cs, rect.top),   Offset(rect.right, rect.top + cs)],
      [rect.bottomLeft,  Offset(rect.left + cs, rect.bottom), Offset(rect.left, rect.bottom - cs)],
      [rect.bottomRight, Offset(rect.right - cs, rect.bottom),Offset(rect.right, rect.bottom - cs)],
    ];
    for (final c in corners) {
      canvas.drawLine(c[1], c[0], corner);
      canvas.drawLine(c[0], c[2], corner);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
