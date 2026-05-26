import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../config/constants.dart';
import '../services/firebase_service.dart';
import '../widgets/stat_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _firebase = FirebaseService();
  Map<String, int> _stats = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    try {
      final stats = await _firebase.getUserStats();
      if (mounted) setState(() { _stats = stats; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = _firebase.currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _loadStats,
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: CustomScrollView(
          slivers: [
            // ── App Bar ──
            SliverAppBar(
              backgroundColor: AppColors.background,
              expandedHeight: 120,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppColors.primary.withOpacity(0.08),
                        AppColors.background,
                      ],
                    ),
                  ),
                ),
                title: const Text(AppStrings.appName,
                    style: AppTextStyles.heading2),
                titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout_rounded,
                      color: AppColors.textSecondary),
                  onPressed: () async {
                    await _firebase.signOut();
                    if (mounted) Navigator.pushReplacementNamed(context, '/login');
                  },
                ),
              ],
            ),

            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Welcome
                  Text(
                    'Welcome back,',
                    style: AppTextStyles.body,
                  ),
                  Text(
                    user?.email?.split('@').first ?? 'User',
                    style: AppTextStyles.heading1,
                  ),
                  const SizedBox(height: 8),
                  _StatusBadge(isOnline: true),
                  const SizedBox(height: 28),

                  // Stats grid
                  Text('THREAT SUMMARY', style: AppTextStyles.label),
                  const SizedBox(height: 12),
                  if (_loading)
                    const Center(
                      child: CircularProgressIndicator(
                          color: AppColors.primary),
                    )
                  else
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.3,
                      children: [
                        StatCard(
                          label: 'TOTAL SCANS',
                          value: '${_stats['total'] ?? 0}',
                          icon: Icons.radar_rounded,
                          color: AppColors.primary,
                        ),
                        StatCard(
                          label: 'SAFE',
                          value: '${_stats['safe'] ?? 0}',
                          icon: Icons.verified_rounded,
                          color: AppColors.safe,
                        ),
                        StatCard(
                          label: 'SUSPICIOUS',
                          value: '${_stats['suspicious'] ?? 0}',
                          icon: Icons.warning_amber_rounded,
                          color: AppColors.warning,
                        ),
                        StatCard(
                          label: 'DANGEROUS',
                          value: '${_stats['dangerous'] ?? 0}',
                          icon: Icons.dangerous_rounded,
                          color: AppColors.danger,
                        ),
                      ],
                    ),

                  const SizedBox(height: 28),

                  // Chart
                  if (!_loading && (_stats['total'] ?? 0) > 0) ...[
                    Text('THREAT DISTRIBUTION', style: AppTextStyles.label),
                    const SizedBox(height: 12),
                    _ThreatPieChart(stats: _stats),
                    const SizedBox(height: 28),
                  ],

                  // Quick action buttons
                  Text('QUICK SCAN', style: AppTextStyles.label),
                  const SizedBox(height: 12),
                  _QuickActions(),
                  const SizedBox(height: 20),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final bool isOnline;
  const _StatusBadge({required this.isOnline});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isOnline ? AppColors.safe : AppColors.danger,
            boxShadow: [
              BoxShadow(
                color: (isOnline ? AppColors.safe : AppColors.danger)
                    .withOpacity(0.6),
                blurRadius: 6,
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          isOnline ? 'Protection Active' : 'Offline',
          style: AppTextStyles.body.copyWith(
            color: isOnline ? AppColors.safe : AppColors.danger,
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}

class _ThreatPieChart extends StatelessWidget {
  final Map<String, int> stats;
  const _ThreatPieChart({required this.stats});

  @override
  Widget build(BuildContext context) {
    final safe       = (stats['safe'] ?? 0).toDouble();
    final suspicious = (stats['suspicious'] ?? 0).toDouble();
    final dangerous  = (stats['dangerous'] ?? 0).toDouble();
    final total      = safe + suspicious + dangerous;
    if (total == 0) return const SizedBox.shrink();

    return Container(
      height: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 40,
                sections: [
                  if (safe > 0)
                    PieChartSectionData(
                      value: safe,
                      color: AppColors.safe,
                      radius: 40,
                      showTitle: false,
                    ),
                  if (suspicious > 0)
                    PieChartSectionData(
                      value: suspicious,
                      color: AppColors.warning,
                      radius: 40,
                      showTitle: false,
                    ),
                  if (dangerous > 0)
                    PieChartSectionData(
                      value: dangerous,
                      color: AppColors.danger,
                      radius: 40,
                      showTitle: false,
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 16),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Legend(color: AppColors.safe, label: 'Safe', value: safe.toInt()),
              const SizedBox(height: 8),
              _Legend(color: AppColors.warning, label: 'Suspicious', value: suspicious.toInt()),
              const SizedBox(height: 8),
              _Legend(color: AppColors.danger, label: 'Dangerous', value: dangerous.toInt()),
            ],
          ),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  final Color color;
  final String label;
  final int value;
  const _Legend({required this.color, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 10, height: 10,
            decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
        const SizedBox(width: 8),
        Text('$label ($value)', style: AppTextStyles.body.copyWith(fontSize: 12)),
      ],
    );
  }
}

class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final actions = [
      (Icons.link_rounded,       'Scan URL',  AppColors.primary,  '/url'),
      (Icons.sms_rounded,        'Scan SMS',  AppColors.warning,  '/sms'),
      (Icons.qr_code_scanner_rounded, 'Scan QR', AppColors.safe, '/qr'),
      (Icons.flag_rounded,       'Report',    AppColors.danger,   '/report'),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 2.5,
      children: actions.map((a) => _ActionButton(
        icon: a.$1, label: a.$2, color: a.$3, route: a.$4,
      )).toList(),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final String route;
  const _ActionButton({
    required this.icon, required this.label,
    required this.color, required this.route,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, route),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 10),
            Text(label,
                style: AppTextStyles.body
                    .copyWith(color: AppColors.textPrimary, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
