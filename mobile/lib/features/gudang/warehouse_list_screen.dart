import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../shared/widgets/status_badge.dart';

class WarehouseListScreen extends StatefulWidget {
  const WarehouseListScreen({super.key});

  @override
  State<WarehouseListScreen> createState() => _WarehouseListScreenState();
}

class _WarehouseListScreenState extends State<WarehouseListScreen> {
  List<dynamic> _warehouses = [];
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
      final r = await ApiClient().get('${ApiEndpoints.warehouses}?limit=100');
      if (mounted) {
        setState(() {
          _warehouses = (r['data'] as List?) ?? [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gudang B3')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.wifi_off_rounded,
                          size: 48, color: AppColors.textMuted),
                      const SizedBox(height: 12),
                      Text('Gagal memuat',
                          style:
                              TextStyle(color: AppColors.textSecondary)),
                      const SizedBox(height: 12),
                      ElevatedButton(
                          onPressed: _load,
                          child: const Text('Coba Lagi')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _warehouses.isEmpty
                      ? const Center(
                          child: Text('Belum ada gudang',
                              style: TextStyle(color: Colors.grey)))
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _warehouses.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (_, i) =>
                              _WarehouseCard(wh: _warehouses[i]),
                        ),
                ),
    );
  }
}

class _WarehouseCard extends StatelessWidget {
  final Map<String, dynamic> wh;
  const _WarehouseCard({required this.wh});

  @override
  Widget build(BuildContext context) {
    final wasteTypes =
        (wh['wasteTypes'] as List?)?.cast<String>() ?? [];

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
                        wh['name'] ?? '',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        wh['address'] ?? '',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                StatusBadge(status: wh['status'] ?? ''),
              ],
            ),
            if (wasteTypes.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: wasteTypes
                    .map((wt) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            wt,
                            style: TextStyle(
                                color: AppColors.primary, fontSize: 11),
                          ),
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              children: [
                _Info(
                  Icons.radar,
                  '${(wh['geoFenceRadius'] as num?)?.toStringAsFixed(0) ?? '?'}m',
                ),
                if (wh['capacity'] != null) ...[
                  const SizedBox(width: 14),
                  _Info(
                    Icons.inventory_2_outlined,
                    '${wh['capacity']} ${wh['capacityUnit'] ?? ''}',
                  ),
                ],
                if (wh['pic'] != null) ...[
                  const SizedBox(width: 14),
                  Expanded(
                    child: _Info(
                      Icons.person_outline,
                      wh['pic'],
                      overflow: true,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Info extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool overflow;
  const _Info(this.icon, this.text, {this.overflow = false});

  @override
  Widget build(BuildContext context) {
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors.textMuted),
        const SizedBox(width: 4),
        overflow
            ? Flexible(
                child: Text(text,
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 12),
                    overflow: TextOverflow.ellipsis))
            : Text(text,
                style: TextStyle(
                    color: AppColors.textSecondary, fontSize: 12)),
      ],
    );
    return overflow ? content : content;
  }
}
