import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../auth/auth_provider.dart';
import 'inspection_provider.dart';
import '../../shared/widgets/status_badge.dart';

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
    final isMyInspection =
        insp['inspector']?['id'] == currentUserId;
    final canStart =
        insp['status'] == 'dijadwalkan' && isMyInspection;

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
                      Text(
                        insp['warehouse']?['name'] ?? '',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
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
                    insp['inspector']?['name'] ?? '',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            if (canStart) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () =>
                      context.push('/inspeksi/${insp['id']}/lakukan'),
                  icon: const Icon(Icons.play_arrow_rounded, size: 18),
                  label: const Text('Mulai Inspeksi'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding:
                        const EdgeInsets.symmetric(vertical: 10),
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
