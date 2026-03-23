import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
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

  static Color statusColor(String? status) {
    switch (status) {
      case 'aktif': return const Color(0xFF10b981);
      case 'perbaikan': return const Color(0xFFf59e0b);
      default: return const Color(0xFFef4444);
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
                      Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.textMuted),
                      const SizedBox(height: 12),
                      Text('Gagal memuat', style: TextStyle(color: AppColors.textSecondary)),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _load, child: const Text('Coba Lagi')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _warehouses.isEmpty
                      ? const Center(child: Text('Belum ada gudang', style: TextStyle(color: Colors.grey)))
                      : ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            _buildMainMap(),
                            const SizedBox(height: 16),
                            ...List.generate(
                              _warehouses.length,
                              (i) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: _WarehouseCard(wh: _warehouses[i]),
                              ),
                            ),
                          ],
                        ),
                ),
    );
  }

  Widget _buildMainMap() {
    final valid = _warehouses.where((w) =>
        w['latitude'] != null && w['longitude'] != null).toList();
    if (valid.isEmpty) return const SizedBox.shrink();

    final center = LatLng(
      valid.map((w) => (w['latitude'] as num).toDouble()).reduce((a, b) => a + b) / valid.length,
      valid.map((w) => (w['longitude'] as num).toDouble()).reduce((a, b) => a + b) / valid.length,
    );

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
              child: Row(
                children: [
                  Icon(Icons.location_on_outlined, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text('Peta Lokasi Gudang',
                      style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                ],
              ),
            ),
            SizedBox(
              height: 260,
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: center,
                  initialZoom: 10,
                  interactionOptions: const InteractionOptions(
                    flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
                  ),
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.example.inspeksipro',
                  ),
                  CircleLayer(
                    circles: valid.map((w) => CircleMarker(
                      point: LatLng(
                        (w['latitude'] as num).toDouble(),
                        (w['longitude'] as num).toDouble(),
                      ),
                      radius: 10,
                      color: statusColor(w['status']),
                      borderColor: Colors.white,
                      borderStrokeWidth: 2.5,
                    )).toList(),
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

class _WarehouseCard extends StatelessWidget {
  final Map<String, dynamic> wh;
  const _WarehouseCard({required this.wh});

  @override
  Widget build(BuildContext context) {
    final wasteTypes = (wh['wasteTypes'] as List?)?.cast<String>() ?? [];

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/gudang/${wh['id']}', extra: wh),
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
                        Text(wh['name'] ?? '',
                            style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15)),
                        const SizedBox(height: 3),
                        Text(wh['address'] ?? '',
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                            maxLines: 2, overflow: TextOverflow.ellipsis),
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
                  spacing: 6, runSpacing: 4,
                  children: wasteTypes.map((wt) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(wt, style: TextStyle(color: AppColors.primary, fontSize: 11)),
                  )).toList(),
                ),
              ],
              const SizedBox(height: 10),
              const Divider(height: 1),
              const SizedBox(height: 10),
              Row(
                children: [
                  Icon(Icons.radar, size: 13, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text('${(wh['geoFenceRadius'] as num?)?.toStringAsFixed(0) ?? '?'}m',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  if (wh['capacity'] != null) ...[
                    const SizedBox(width: 14),
                    Icon(Icons.inventory_2_outlined, size: 13, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text('${wh['capacity']} ${wh['capacityUnit'] ?? ''}',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  ],
                  if (wh['pic'] != null) ...[
                    const SizedBox(width: 14),
                    Icon(Icons.person_outline, size: 13, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(wh['pic'],
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          overflow: TextOverflow.ellipsis),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
