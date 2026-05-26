import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../services/firebase_service.dart';
import '../models/threat_history.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final _firebase = FirebaseService();
  List<ThreatHistoryItem> _items = [];
  bool _loading = true;
  String _filter = 'all'; // all | safe | suspicious | dangerous

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final items = await _firebase.getScanHistory();
      if (mounted) setState(() { _items = items; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<ThreatHistoryItem> get _filtered {
    if (_filter == 'all') return _items;
    return _items.where((i) => i.threatLevel == _filter).toList();
  }

  Color _color(String level) {
    switch (level) {
      case 'safe':       return AppColors.safe;
      case 'suspicious': return AppColors.warning;
      case 'dangerous':  return AppColors.danger;
      default:           return AppColors.textMuted;
    }
  }

  IconData _icon(String level) {
    switch (level) {
      case 'safe':       return Icons.verified_rounded;
      case 'suspicious': return Icons.warning_amber_rounded;
      case 'dangerous':  return Icons.dangerous_rounded;
      default:           return Icons.help_outline;
    }
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'url':  return Icons.link_rounded;
      case 'sms':  return Icons.sms_rounded;
      case 'qr':   return Icons.qr_code_rounded;
      case 'app':  return Icons.android_rounded;
      default:     return Icons.radar_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('Scan History', style: AppTextStyles.heading2),
        centerTitle: false,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded,
                color: AppColors.textSecondary),
            onPressed: _load,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Row(
              children: ['all', 'safe', 'suspicious', 'dangerous'].map((f) {
                final selected = _filter == f;
                final color = f == 'all' ? AppColors.primary : _color(f);
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => setState(() => _filter = f),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        color: selected
                            ? color.withOpacity(0.15)
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected
                              ? color.withOpacity(0.6)
                              : AppColors.border,
                        ),
                      ),
                      child: Text(
                        f.toUpperCase(),
                        style: TextStyle(
                          color: selected ? color : AppColors.textMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // List
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : _filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.history_rounded,
                                color: AppColors.textMuted, size: 48),
                            const SizedBox(height: 12),
                            Text('No scans yet',
                                style: AppTextStyles.body
                                    .copyWith(color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: AppColors.primary,
                        backgroundColor: AppColors.surface,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                          itemCount: _filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final item = _filtered[i];
                            final color = _color(item.threatLevel);
                            return Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                    color: color.withOpacity(0.2)),
                              ),
                              child: Row(
                                children: [
                                  // Type icon
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: AppColors.background,
                                      borderRadius:
                                          BorderRadius.circular(10),
                                      border: Border.all(
                                          color: AppColors.border),
                                    ),
                                    child: Icon(_typeIcon(item.scanType),
                                        color: AppColors.primary, size: 20),
                                  ),
                                  const SizedBox(width: 12),
                                  // Info
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.displayInput,
                                          style: AppTextStyles.body.copyWith(
                                              color: AppColors.textPrimary,
                                              fontSize: 13),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(
                                                  horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppColors.background,
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                item.scanTypeLabel,
                                                style: AppTextStyles.label
                                                    .copyWith(fontSize: 10),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              _formatDate(item.scannedAt),
                                              style: AppTextStyles.label
                                                  .copyWith(fontSize: 10),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  // Status
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.end,
                                    children: [
                                      Icon(_icon(item.threatLevel),
                                          color: color, size: 20),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${item.confidence.toStringAsFixed(0)}%',
                                        style: TextStyle(
                                          color: color,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24)   return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
