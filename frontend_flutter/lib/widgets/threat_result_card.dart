import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../models/scan_result.dart';

class ThreatResultCard extends StatefulWidget {
  final ScanResult result;
  const ThreatResultCard({super.key, required this.result});

  @override
  State<ThreatResultCard> createState() => _ThreatResultCardState();
}

class _ThreatResultCardState extends State<ThreatResultCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _fade;
  late Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
    _fade  = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Color get _statusColor {
    if (widget.result.isSafe)       return AppColors.safe;
    if (widget.result.isSuspicious) return AppColors.warning;
    return AppColors.danger;
  }

  Color get _glowColor {
    if (widget.result.isSafe)       return AppColors.safeGlow;
    if (widget.result.isSuspicious) return AppColors.warningGlow;
    return AppColors.dangerGlow;
  }

  IconData get _statusIcon {
    if (widget.result.isSafe)       return Icons.verified_rounded;
    if (widget.result.isSuspicious) return Icons.warning_amber_rounded;
    return Icons.dangerous_rounded;
  }

  String get _statusLabel {
    if (widget.result.isSafe)       return 'SAFE';
    if (widget.result.isSuspicious) return 'SUSPICIOUS';
    return 'DANGEROUS';
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: _slide,
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _statusColor.withOpacity(0.4), width: 1.5),
            boxShadow: [
              BoxShadow(color: _glowColor, blurRadius: 20, spreadRadius: 2),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: _glowColor,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: _statusColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _statusColor.withOpacity(0.5)),
                      ),
                      child: Icon(_statusIcon, color: _statusColor, size: 28),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _statusLabel,
                            style: TextStyle(
                              color: _statusColor,
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Confidence: ${widget.result.confidence.toStringAsFixed(1)}%',
                            style: AppTextStyles.body.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _ConfidenceRing(
                      value: widget.result.confidence / 100,
                      color: _statusColor,
                    ),
                  ],
                ),
              ),

              // ── Input ──
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('SCANNED INPUT', style: AppTextStyles.label),
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        widget.result.input,
                        style: AppTextStyles.mono.copyWith(fontSize: 12),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),

              // ── Reasons ──
              if (widget.result.reasons.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('THREAT INDICATORS', style: AppTextStyles.label),
                      const SizedBox(height: 8),
                      ...widget.result.reasons.map((reason) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              children: [
                                Icon(Icons.chevron_right_rounded,
                                    color: _statusColor, size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(reason,
                                      style: AppTextStyles.body.copyWith(
                                          color: AppColors.textPrimary)),
                                ),
                              ],
                            ),
                          )),
                    ],
                  ),
                ),

              // ── ML Result Features ──
              if (widget.result.mlResult?.topFeatures.isNotEmpty ?? false)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('ML ANALYSIS - TOP FEATURES', style: AppTextStyles.label),
                      const SizedBox(height: 8),
                      ...widget.result.mlResult!.topFeatures.map((feature) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: feature.flagged
                                      ? AppColors.danger.withOpacity(0.4)
                                      : AppColors.border,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          feature.feature,
                                          style: AppTextStyles.label
                                              .copyWith(
                                                  color: AppColors
                                                      .textPrimary,
                                                  fontWeight:
                                                      FontWeight.w600),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: feature.flagged
                                              ? AppColors.danger
                                                  .withOpacity(0.2)
                                              : AppColors.safe.withOpacity(0.2),
                                          borderRadius:
                                              BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          feature.flagged
                                              ? '⚠ FLAGGED'
                                              : '✓ OK',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: feature.flagged
                                                ? AppColors.danger
                                                : AppColors.safe,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Value: ${feature.value} | Risk: ${feature.riskContribution}',
                                        style: AppTextStyles.body
                                            .copyWith(fontSize: 11),
                                      ),
                                      Text(
                                        'Importance: ${(feature.importance * 100).toStringAsFixed(1)}%',
                                        style: AppTextStyles.body
                                            .copyWith(
                                                fontSize: 11,
                                                color:
                                                    AppColors.primary),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          )),
                    ],
                  ),
                ),

              // ── VirusTotal ──
              if (widget.result.virustotal != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: _VirusTotalBadge(vt: widget.result.virustotal!),
                ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Confidence Ring ─────────────────────────────────────────────────────────
class _ConfidenceRing extends StatelessWidget {
  final double value;
  final Color color;
  const _ConfidenceRing({required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 52,
      height: 52,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: value,
            strokeWidth: 4,
            backgroundColor: color.withOpacity(0.15),
            valueColor: AlwaysStoppedAnimation(color),
          ),
          Text(
            '${(value * 100).round()}%',
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

// ── VirusTotal Badge ─────────────────────────────────────────────────────────
class _VirusTotalBadge extends StatelessWidget {
  final Map<String, dynamic> vt;
  const _VirusTotalBadge({required this.vt});

  @override
  Widget build(BuildContext context) {
    final malicious = vt['malicious'] ?? 0;
    final total     = vt['total_engines'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.shield_outlined,
              color: AppColors.primary, size: 18),
          const SizedBox(width: 10),
          Text('VirusTotal: ', style: AppTextStyles.label),
          Text(
            '$malicious / $total engines flagged',
            style: TextStyle(
              color: malicious > 0 ? AppColors.danger : AppColors.safe,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
