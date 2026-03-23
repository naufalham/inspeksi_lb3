import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/constants/app_colors.dart';
import '../../shared/widgets/status_badge.dart';

class WarehouseDetailScreen extends StatelessWidget {
  final Map<String, dynamic> wh;
  const WarehouseDetailScreen({super.key, required this.wh});

  static Color statusColor(String? status) {
    switch (status) {
      case 'aktif': return const Color(0xFF10b981);
      case 'perbaikan': return const Color(0xFFf59e0b);
      default: return const Color(0xFFef4444);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lat = (wh['latitude'] as num?)?.toDouble();
    final lng = (wh['longitude'] as num?)?.toDouble();
    final radius = (wh['geoFenceRadius'] as num?)?.toDouble() ?? 100;
    final wasteTypes = (wh['wasteTypes'] as List?)?.cast<String>() ?? [];
    final hasLocation = lat != null && lng != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(wh['name'] ?? 'Detail Gudang'),
      ),
      body: ListView(
        children: [
          // Mini Map
          if (hasLocation)
            SizedBox(
              height: 220,
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: LatLng(lat, lng),
                  initialZoom: 15,
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
                    circles: [
                      CircleMarker(
                        point: LatLng(lat, lng),
                        radius: 10,
                        color: statusColor(wh['status'] as String?),
                        borderColor: Colors.white,
                        borderStrokeWidth: 2.5,
                      ),
                    ],
                  ),
                ],
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Nama + Status
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        wh['name'] ?? '',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    StatusBadge(status: wh['status'] ?? ''),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  wh['address'] ?? '',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),

                if (wasteTypes.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text('Jenis Limbah',
                      style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: wasteTypes
                        .map((wt) => Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(wt,
                                  style: TextStyle(
                                      color: AppColors.primary, fontSize: 12)),
                            ))
                        .toList(),
                  ),
                ],

                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 16),

                // Info Grid
                _InfoRow(
                  icon: Icons.radar,
                  label: 'Radius Geofence',
                  value: '${radius.toStringAsFixed(0)} m',
                ),
                if (wh['capacity'] != null) ...[
                  const SizedBox(height: 10),
                  _InfoRow(
                    icon: Icons.inventory_2_outlined,
                    label: 'Kapasitas',
                    value:
                        '${wh['capacity']} ${wh['capacityUnit'] ?? ''}',
                  ),
                ],
                if (wh['pic'] != null) ...[
                  const SizedBox(height: 10),
                  _InfoRow(
                    icon: Icons.person_outline,
                    label: 'PIC',
                    value: wh['pic'],
                  ),
                ],
                if (wh['picPhone'] != null) ...[
                  const SizedBox(height: 10),
                  _InfoRow(
                    icon: Icons.phone_outlined,
                    label: 'Telepon PIC',
                    value: wh['picPhone'],
                  ),
                ],
                if (hasLocation) ...[
                  const SizedBox(height: 10),
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: 'Koordinat',
                    value: '${lat.toStringAsFixed(6)}, ${lng.toStringAsFixed(6)}',
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.textMuted),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w500)),
              const SizedBox(height: 2),
              Text(value,
                  style:
                      TextStyle(color: AppColors.textPrimary, fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }
}
