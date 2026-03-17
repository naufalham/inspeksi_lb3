import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../auth/auth_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final r = await ApiClient().get(ApiEndpoints.reportsDashboard);
      if (mounted) setState(() { _data = r['data']; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            tooltip: 'Logout',
            onPressed: () async {
              await auth.logout();
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _buildContent(auth),
                ),
    );
  }

  Widget _buildError() => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded,
                size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text('Gagal memuat data',
                style: TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: _load, child: const Text('Coba Lagi')),
          ],
        ),
      );

  Widget _buildContent(AuthProvider auth) {
    final d = _data!;
    final fbs = d['findingsBySeverity'] as Map<String, dynamic>? ?? {};
    final byWh = d['complianceByWarehouse'] as List? ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Greeting
        Text(
          'Selamat datang, ${auth.user?['name'] ?? ''}',
          style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13),
        ),
        const SizedBox(height: 16),

        // Stats grid
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            _StatCard('Total Inspeksi', '${d['totalInspections'] ?? 0}',
                Icons.assignment_outlined, AppColors.primary),
            _StatCard('Selesai', '${d['selesai'] ?? 0}',
                Icons.check_circle_outline, AppColors.success),
            _StatCard('Rata-rata Skor',
                '${d['averageComplianceScore'] ?? 0}%',
                Icons.bar_chart_rounded, AppColors.warning),
            _StatCard('Temuan Kritis', '${d['criticalFindings'] ?? 0}',
                Icons.warning_amber_rounded, AppColors.danger),
          ],
        ),
        const SizedBox(height: 16),

        // Status breakdown
        _Card(
          title: 'Status Inspeksi',
          child: Row(
            children: [
              _StatusItem('Terjadwal', '${d['dijadwalkan'] ?? 0}',
                  AppColors.info),
              _StatusItem('Berlangsung', '${d['berlangsung'] ?? 0}',
                  AppColors.warning),
              _StatusItem('Selesai', '${d['selesai'] ?? 0}',
                  AppColors.success),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Findings severity
        _Card(
          title: 'Distribusi Temuan',
          child: Row(
            children: [
              _StatusItem('Ringan', '${fbs['ringan'] ?? 0}', AppColors.info),
              _StatusItem('Sedang', '${fbs['sedang'] ?? 0}',
                  AppColors.warning),
              _StatusItem('Kritis', '${fbs['kritis'] ?? 0}',
                  AppColors.danger),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Compliance by warehouse
        if (byWh.isNotEmpty)
          _Card(
            title: 'Kepatuhan per Gudang',
            child: Column(
              children: byWh.map((wh) {
                final score = (wh['avgScore'] as num?)?.toInt() ?? 0;
                final color = score >= 80
                    ? AppColors.success
                    : score >= 60
                        ? AppColors.warning
                        : AppColors.danger;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              wh['name'] ?? '',
                              style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 13),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            '$score%',
                            style: TextStyle(
                                color: color,
                                fontWeight: FontWeight.w700,
                                fontSize: 13),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: score / 100,
                          backgroundColor: AppColors.border,
                          color: color,
                          minHeight: 6,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard(this.label, this.value, this.icon, this.color);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 8),
            Text(value,
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                    color: AppColors.textSecondary, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final String title;
  final Widget child;
  const _Card({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14)),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _StatusItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatusItem(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  color: color,
                  fontSize: 20,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label,
              style: TextStyle(
                  color: AppColors.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }
}
