import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final bool large;

  const StatusBadge({super.key, required this.status, this.large = false});

  @override
  Widget build(BuildContext context) {
    final cfg = _config(status);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: large ? 12 : 8,
        vertical: large ? 5 : 3,
      ),
      decoration: BoxDecoration(
        color: cfg.bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        cfg.label,
        style: TextStyle(
          color: cfg.color,
          fontSize: large ? 13 : 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  _BadgeCfg _config(String s) {
    switch (s) {
      case 'dijadwalkan':
        return _BadgeCfg('Terjadwal', AppColors.info,
            AppColors.info.withOpacity(0.15));
      case 'berlangsung':
        return _BadgeCfg('Berlangsung', AppColors.warning,
            AppColors.warning.withOpacity(0.15));
      case 'selesai':
        return _BadgeCfg('Selesai', AppColors.success,
            AppColors.success.withOpacity(0.15));
      case 'dibatalkan':
        return _BadgeCfg('Dibatalkan', AppColors.textSecondary,
            AppColors.border.withOpacity(0.3));
      case 'aktif':
        return _BadgeCfg(
            'Aktif', AppColors.success, AppColors.success.withOpacity(0.15));
      case 'tidak_aktif':
        return _BadgeCfg('Non-Aktif', AppColors.textSecondary,
            AppColors.border.withOpacity(0.3));
      case 'perbaikan':
        return _BadgeCfg('Perbaikan', AppColors.warning,
            AppColors.warning.withOpacity(0.15));
      case 'ringan':
        return _BadgeCfg(
            'Ringan', AppColors.info, AppColors.info.withOpacity(0.15));
      case 'sedang':
        return _BadgeCfg('Sedang', AppColors.warning,
            AppColors.warning.withOpacity(0.15));
      case 'kritis':
        return _BadgeCfg(
            'Kritis', AppColors.danger, AppColors.danger.withOpacity(0.15));
      case 'pending':
        return _BadgeCfg('Pending', AppColors.warning,
            AppColors.warning.withOpacity(0.15));
      case 'resolved':
        return _BadgeCfg('Selesai', AppColors.success,
            AppColors.success.withOpacity(0.15));
      default:
        return _BadgeCfg(
            s, AppColors.textSecondary, AppColors.border.withOpacity(0.2));
    }
  }
}

class _BadgeCfg {
  final String label;
  final Color color;
  final Color bg;
  _BadgeCfg(this.label, this.color, this.bg);
}
