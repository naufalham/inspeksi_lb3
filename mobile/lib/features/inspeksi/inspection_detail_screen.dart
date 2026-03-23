import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../shared/widgets/status_badge.dart';

const _typeLabels = {
  'tps_lb3': 'TPS LB3', 'apd': 'APD', 'p3k': 'P3K',
  'apar': 'APAR', 'fire_alarm': 'Fire Alarm', 'hydrant': 'Hydrant',
};

Color _typeColor(String? type) {
  switch (type) {
    case 'tps_lb3': return const Color(0xFF6366f1);
    case 'apd': return const Color(0xFFf97316);
    case 'p3k': return const Color(0xFFef4444);
    case 'apar': return const Color(0xFFf43f5e);
    case 'fire_alarm': return const Color(0xFFf59e0b);
    case 'hydrant': return const Color(0xFF3b82f6);
    default: return const Color(0xFF6b7280);
  }
}

class InspectionDetailScreen extends StatefulWidget {
  final String inspectionId;
  const InspectionDetailScreen({super.key, required this.inspectionId});

  @override
  State<InspectionDetailScreen> createState() => _InspectionDetailScreenState();
}

class _InspectionDetailScreenState extends State<InspectionDetailScreen> {
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
      final r = await ApiClient().get('${ApiEndpoints.inspections}/${widget.inspectionId}');
      setState(() { _data = r['data']; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Text('Detail Inspeksi'),
        actions: [
          if (_data?['status'] == 'berlangsung')
            TextButton.icon(
              onPressed: () => context.push('/inspeksi/${widget.inspectionId}/lakukan'),
              icon: const Icon(Icons.arrow_forward_rounded, size: 16),
              label: const Text('Lanjutkan'),
              style: TextButton.styleFrom(foregroundColor: AppColors.warning),
            ),
          if (_data?['status'] == 'dijadwalkan')
            TextButton.icon(
              onPressed: () => context.push('/inspeksi/${widget.inspectionId}/lakukan'),
              icon: const Icon(Icons.play_arrow_rounded, size: 16),
              label: const Text('Mulai'),
              style: TextButton.styleFrom(foregroundColor: AppColors.primary),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.error_outline, color: AppColors.danger, size: 48),
                    const SizedBox(height: 12),
                    Text(_error!, style: TextStyle(color: AppColors.textSecondary)),
                    const SizedBox(height: 16),
                    ElevatedButton(onPressed: _load, child: const Text('Coba Lagi')),
                  ]),
                )
              : RefreshIndicator(onRefresh: _load, child: _Body(data: _data!)),
    );
  }
}

class _Body extends StatelessWidget {
  final Map<String, dynamic> data;
  const _Body({required this.data});

  @override
  Widget build(BuildContext context) {
    final wh = data['warehouse'] as Map<String, dynamic>? ?? {};
    final inspector = data['inspector'] as Map<String, dynamic>?;
    final findings = (data['findings'] as List?) ?? [];
    final photos = (data['photos'] as List?) ?? [];
    final checklist = (data['checklistResults'] as List?) ?? [];
    final score = data['complianceScore'];
    final status = data['status'] as String? ?? '';
    final type = data['type'] as String? ?? '';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header
        _Card(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(wh['name'] ?? '',
                      style: TextStyle(color: AppColors.textPrimary,
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(wh['address'] ?? '',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                ],
              )),
              if (score != null) ...[
                const SizedBox(width: 12),
                _ScoreCircle(score: (score as num).toInt()),
              ],
            ]),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 6, children: [
              StatusBadge(status: status),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _typeColor(type).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(_typeLabels[type] ?? type,
                    style: TextStyle(color: _typeColor(type),
                        fontSize: 11, fontWeight: FontWeight.w600)),
              ),
              if (data['overallStatus'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.info.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(data['overallStatus'],
                      style: TextStyle(color: AppColors.info,
                          fontSize: 11, fontWeight: FontWeight.w600)),
                ),
            ]),
          ],
        )),
        const SizedBox(height: 12),

        // Info
        _Card(child: Column(children: [
          _InfoRow(icon: Icons.person_outline, label: 'Inspektur',
              value: inspector?['name'] ?? 'Belum ditugaskan'),
          _Div(),
          _InfoRow(icon: Icons.calendar_today_outlined, label: 'Terjadwal',
              value: _fmt(data['scheduledDate'])),
          if (data['startedAt'] != null) ...[
            _Div(),
            _InfoRow(icon: Icons.play_circle_outline, label: 'Mulai',
                value: _fmt(data['startedAt'])),
          ],
          if (data['completedAt'] != null) ...[
            _Div(),
            _InfoRow(icon: Icons.check_circle_outline, label: 'Selesai',
                value: _fmt(data['completedAt'])),
          ],
          if (data['notes'] != null && data['notes'] != '') ...[
            _Div(),
            _InfoRow(icon: Icons.notes_outlined, label: 'Catatan', value: data['notes']),
          ],
        ])),
        const SizedBox(height: 12),

        // Checklist
        if (checklist.isNotEmpty) ...[
          _SectionHeader(title: 'Checklist', count: checklist.length),
          const SizedBox(height: 8),
          _Card(child: Column(children: [
            for (var i = 0; i < checklist.length; i++) ...[
              if (i > 0) _Div(),
              _ChecklistRow(item: checklist[i]),
            ],
          ])),
          const SizedBox(height: 12),
        ],

        // Findings
        _SectionHeader(title: 'Temuan', count: findings.length),
        const SizedBox(height: 8),
        if (findings.isEmpty)
          _Empty(text: 'Tidak ada temuan')
        else
          for (final f in findings)
            Padding(padding: const EdgeInsets.only(bottom: 8),
                child: _FindingCard(finding: f)),
        const SizedBox(height: 12),

        // Photos
        _SectionHeader(title: 'Foto', count: photos.length),
        const SizedBox(height: 8),
        if (photos.isEmpty)
          _Empty(text: 'Tidak ada foto')
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3, crossAxisSpacing: 6, mainAxisSpacing: 6),
            itemCount: photos.length,
            itemBuilder: (_, i) => _PhotoTile(photo: photos[i]),
          ),
        const SizedBox(height: 24),
      ],
    );
  }

  static String _fmt(dynamic raw) {
    if (raw == null) return '-';
    final dt = DateTime.tryParse(raw.toString());
    if (dt == null) return '-';
    return '${dt.day}/${dt.month}/${dt.year} '
        '${dt.hour.toString().padLeft(2, '0')}:'
        '${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _ScoreCircle extends StatelessWidget {
  final int score;
  const _ScoreCircle({required this.score});
  Color get _c => score >= 80 ? AppColors.success : score >= 60 ? AppColors.warning : AppColors.danger;
  @override
  Widget build(BuildContext context) => Container(
        width: 64, height: 64,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: _c, width: 3),
          color: _c.withValues(alpha: 0.1),
        ),
        child: Center(
          child: Text('$score%',
              style: TextStyle(color: _c, fontWeight: FontWeight.bold, fontSize: 15)),
        ),
      );
}

class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: child,
      );
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 16, color: AppColors.textMuted),
          const SizedBox(width: 8),
          SizedBox(width: 90,
              child: Text(label, style: TextStyle(color: AppColors.textMuted, fontSize: 12))),
          Expanded(
              child: Text(value, style: TextStyle(color: AppColors.textPrimary, fontSize: 13))),
        ]),
      );
}

class _Div extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      Divider(color: AppColors.border, height: 1, thickness: 1);
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  const _SectionHeader({required this.title, required this.count});
  @override
  Widget build(BuildContext context) => Row(children: [
        Text(title,
            style: TextStyle(
                color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text('$count',
              style: TextStyle(
                  color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w600)),
        ),
      ]);
}

class _Empty extends StatelessWidget {
  final String text;
  const _Empty({required this.text});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
        ),
        child: Center(
            child: Text(text, style: TextStyle(color: AppColors.textMuted, fontSize: 13))),
      );
}

class _FindingCard extends StatelessWidget {
  final Map<String, dynamic> finding;
  const _FindingCard({required this.finding});

  Color _sevColor(String s) {
    switch (s) {
      case 'kritis': return AppColors.danger;
      case 'sedang': return AppColors.warning;
      default: return AppColors.info;
    }
  }
  String _sevLabel(String s) {
    switch (s) {
      case 'kritis': return 'Kritis';
      case 'sedang': return 'Sedang';
      default: return 'Ringan';
    }
  }

  @override
  Widget build(BuildContext context) {
    final sev = finding['severity'] as String? ?? 'ringan';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _sevColor(sev).withValues(alpha: 0.3)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: _sevColor(sev).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(_sevLabel(sev),
                style: TextStyle(
                    color: _sevColor(sev), fontSize: 11, fontWeight: FontWeight.w600)),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: finding['followUpStatus'] == 'resolved'
                  ? AppColors.success.withValues(alpha: 0.15)
                  : AppColors.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              finding['followUpStatus'] == 'resolved' ? 'Selesai' : 'Pending',
              style: TextStyle(
                color: finding['followUpStatus'] == 'resolved'
                    ? AppColors.success : AppColors.warning,
                fontSize: 10, fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ]),
        const SizedBox(height: 8),
        Text(finding['description'] ?? '',
            style: TextStyle(color: AppColors.textPrimary, fontSize: 13)),
        if (finding['recommendation'] != null && finding['recommendation'] != '') ...[
          const SizedBox(height: 6),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.lightbulb_outline, size: 13, color: AppColors.warning),
            const SizedBox(width: 4),
            Expanded(
              child: Text(finding['recommendation'],
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ),
          ]),
        ],
      ]),
    );
  }
}

class _PhotoTile extends StatelessWidget {
  final Map<String, dynamic> photo;
  const _PhotoTile({required this.photo});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showFullscreen(context),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Stack(fit: StackFit.expand, children: [
          Image.network(
            photo['url'] ?? '',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              color: AppColors.card,
              child: Icon(Icons.broken_image_outlined, color: AppColors.textMuted),
            ),
          ),
          if (photo['label'] != null && photo['label'] != '')
            Positioned(
              bottom: 0, left: 0, right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                color: Colors.black.withValues(alpha: 0.6),
                child: Text(photo['label'],
                    style: const TextStyle(
                        color: Colors.white, fontSize: 9, fontWeight: FontWeight.w500),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
            ),
        ]),
      ),
    );
  }

  void _showFullscreen(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: EdgeInsets.zero,
        child: Stack(children: [
          Center(
            child: InteractiveViewer(
              child: Image.network(photo['url'] ?? '',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Icon(
                        Icons.broken_image_outlined, color: Colors.white54, size: 64)),
            ),
          ),
          Positioned(
            top: 40, right: 16,
            child: IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close, color: Colors.white, size: 28),
            ),
          ),
          if (photo['caption'] != null && photo['caption'] != '')
            Positioned(
              bottom: 40, left: 16, right: 16,
              child: Text(photo['caption'],
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                  textAlign: TextAlign.center),
            ),
        ]),
      ),
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  final Map<String, dynamic> item;
  const _ChecklistRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final tmpl = item['template'] as Map<String, dynamic>? ?? {};
    final status = (item['status'] as String? ?? 'na').toLowerCase();

    Color statusColor;
    IconData statusIcon;
    if (['ya', 'sesuai', 'ada'].contains(status)) {
      statusColor = AppColors.success;
      statusIcon = Icons.check_circle_outline;
    } else if (['tidak', 'tidak sesuai'].contains(status)) {
      statusColor = AppColors.danger;
      statusIcon = Icons.cancel_outlined;
    } else {
      statusColor = AppColors.textMuted;
      statusIcon = Icons.remove_circle_outline;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(statusIcon, color: statusColor, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(tmpl['description'] ?? '',
              style: TextStyle(color: AppColors.textPrimary, fontSize: 12)),
          const SizedBox(height: 2),
          Text(status,
              style: TextStyle(
                  color: statusColor, fontSize: 11, fontWeight: FontWeight.w500)),
        ])),
      ]),
    );
  }
}
