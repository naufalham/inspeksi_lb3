import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFF6366F1);
  static const Color accent = Color(0xFF8B5CF6);
  static const Color background = Color(0xFF0F0E17);
  static const Color surface = Color(0xFF1A1A2E);
  static const Color card = Color(0xFF1E1E34);
  static const Color sidebar = Color(0xFF12121E);
  static const Color inputBg = Color(0xFF0F0F1E);
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
  static const Color textPrimary = Color(0xFFF1F5F9);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);
  static const Color border = Color(0x266366F1);

  static LinearGradient get primaryGradient => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [primary, accent],
      );

  static LinearGradient get successGradient => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF10B981), Color(0xFF059669)],
      );

  static LinearGradient get warningGradient => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
      );

  static LinearGradient get dangerGradient => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
      );

  static LinearGradient get infoGradient => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
      );
}
