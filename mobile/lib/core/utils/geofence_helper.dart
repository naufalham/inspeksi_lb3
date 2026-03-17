import 'dart:math';

class GeofenceHelper {
  /// Haversine formula — returns distance in meters
  static double calcDistance(
      double lat1, double lng1, double lat2, double lng2) {
    const R = 6371000.0;
    final dLat = (lat2 - lat1) * pi / 180;
    final dLng = (lng2 - lng1) * pi / 180;
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180) *
            cos(lat2 * pi / 180) *
            sin(dLng / 2) *
            sin(dLng / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
  }

  static bool isWithinFence(double userLat, double userLng,
      double targetLat, double targetLng, double radiusMeters) {
    return calcDistance(userLat, userLng, targetLat, targetLng) <= radiusMeters;
  }
}
