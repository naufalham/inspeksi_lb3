/**
 * Haversine formula - calculates distance between two GPS coordinates in meters
 */
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function checkGeofence(userLat, userLng, warehouseLat, warehouseLng, radiusMeters) {
  const distance = calcDistance(userLat, userLng, warehouseLat, warehouseLng);
  return {
    distance: Math.round(distance),
    withinFence: distance <= radiusMeters,
    radius: radiusMeters,
  };
}

module.exports = { calcDistance, checkGeofence };
