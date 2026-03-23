import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../auth/auth_provider.dart';
import 'inspection_provider.dart';
import '../../shared/widgets/status_badge.dart';

const _typeLabels = {
  'tps_lb3':    'TPS LB3',
  'apd':        'APD',
  'p3k':        'P3K',
  'apar':       'APAR',
  'fire_alarm': 'Fire Alarm',
  'hydrant':    'Hydrant',
};

Color _typeColor(String? type) {
  switch (type) {
    case 'tps_lb3':    return const Color(0xFF6366f1);
    case 'apd':        return const Color(0xFFf97316);
    case 'p3k':        return const Color(0xFFef4444);
    case 'apar':       return const Color(0xFFf43f5e);
    case 'fire_alarm': return const Color(0xFFf59e0b);
    case 'hydrant':    return const Color(0xFF3b82f6);
    default:           return const Color(0xFF6b7280);
  }
}

class InspectionListScreen extends StatefulWidget {
  const InspectionListScreen({super.key});

  @override
  State<InspectionListScreen> createState() => _InspectionListScreenState();
}

class _InspectionListScreenState extends State<InspectionListScreen> {
  String? _filter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InspectionProvider>().load(status: _filter);
    });
  }

  void _setFilter(String? f) {
    setState(() => _filter = f);
    context.read<InspectionProvider>().load(status: f);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final prov = context.watch<InspectionProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Jadwal Inspeksi'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                for (final item in [
                  [null, 'Semua'],
                  ['dijadwalkan', 'Terjadwal'],
                  ['berlangsung', 'Berlangsung'],
                  ['selesai', 'Selesai'],
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: _FilterChip(
                      label: item[1]!,
                      selected: _filter == item[0],
                      onTap: () => _setFilter(item[0]),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
      body: prov.loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => prov.load(status: _filter),
              child: prov.inspections.isEmpty
                  ? const Center(
                      child: Text('Tidak ada inspeksi',
                          style: TextStyle(color: Colors.grey)))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: prov.inspections.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: 10),
                      itemBuilder: (_, i) => _InspectionCard(
                        insp: prov.inspections[i],
                        currentUserId: auth.user?['id'],
                      ),
                    ),
            ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _InspectionCard extends StatelessWidget {
  final Map<String, dynamic> insp;
  final String? currentUserId;

  const _InspectionCard({required this.insp, this.currentUserId});

  @override
  Widget build(BuildContext context) {
    final scheduledDate = DateTime.tryParse(insp['scheduledDate'] ?? '');
    final score = insp['complianceScore'];
    final isUnassigned = insp['inspector'] == null;
    final isMyInspection =
        insp['inspector']?['id'] == currentUserId;
    final canClaim =
        insp['status'] == 'dijadwalkan' && isUnassigned;
    final canStart =
        insp['status'] == 'dijadwalkan' && isMyInspection && !isUnassigned;
    final canResume =
        insp['status'] == 'berlangsung' && isMyInspection;
    final inProgressByOther =
        insp['status'] == 'berlangsung' && !isMyInspection && !isUnassigned;

    Color? scoreColor;
    if (score != null) {
      final s = (score as num).toInt();
      scoreColor = s >= 80
          ? AppColors.success
          : s >= 60
              ? AppColors.warning
              : AppColors.danger;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              insp['warehouse']?['name'] ?? '',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: _typeColor(insp['type'] as String?).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _typeLabels[insp['type']] ?? (insp['type'] ?? ''),
                              style: TextStyle(
                                color: _typeColor(insp['type'] as String?),
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        insp['warehouse']?['address'] ?? '',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    StatusBadge(status: insp['status'] ?? ''),
                    if (score != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        '${score.toStringAsFixed(0)}%',
                        style: TextStyle(
                          color: scoreColor,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.calendar_today_outlined,
                    size: 13, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Text(
                  scheduledDate != null
                      ? '${scheduledDate.day}/${scheduledDate.month}/${scheduledDate.year}'
                      : '-',
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
                const SizedBox(width: 12),
                Icon(Icons.person_outline,
                    size: 13, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    isUnassigned
                        ? 'Belum ditugaskan'
                        : insp['inspector']?['name'] ?? '',
                    style: TextStyle(
                        color: isUnassigned
                            ? AppColors.textMuted
                            : AppColors.textSecondary,
                        fontSize: 12,
                        fontStyle: isUnassigned
                            ? FontStyle.italic
                            : FontStyle.normal),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            if (inProgressByOther) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.lock_outline, size: 13, color: AppColors.warning),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      'Sedang dikerjakan: ${insp['inspector']?['name'] ?? ''}',
                      style: TextStyle(
                          color: AppColors.warning,
                          fontSize: 12,
                          fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            ],
            if (canClaim || canStart || canResume) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () =>
                      context.push('/inspeksi/${insp['id']}/lakukan'),
                  icon: Icon(
                    canResume
                        ? Icons.arrow_forward_rounded
                        : canClaim
                            ? Icons.add_task_rounded
                            : Icons.play_arrow_rounded,
                    size: 18,
                  ),
                  label: Text(canResume
                      ? 'Lanjutkan Inspeksi'
                      : canClaim
                          ? 'Ambil & Mulai'
                          : 'Mulai Inspeksi'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: canResume
                        ? AppColors.warning
                        : AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
