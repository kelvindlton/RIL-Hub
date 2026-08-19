/**
 * geofence.ts
 * RIL Hub geolocation utilities — configurable hub coordinates and radius check.
 * Admin-configurable in production; update HUB_LOCATIONS to match physical site.
 */

export interface HubLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Allowed attendance radius in metres */
  radius: number;
}

/** All approved check-in locations. Add more entries to support multiple sites. */
export const HUB_LOCATIONS: HubLocation[] = [
  {
    id: 'ril-main',
    name: 'RIL Innovation Hub',
    latitude: 6.5244,   // Lagos, Nigeria — update to real hub coordinates
    longitude: 3.3792,
    radius: 150,        // 150m radius
  },
];

export const PRIMARY_HUB = HUB_LOCATIONS[0];

/**
 * Haversine formula — great-circle distance between two lat/lon points.
 * Returns distance in metres.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6_371_000; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface GeofenceResult {
  within: boolean;
  distanceM: number;
  hub: HubLocation;
}

/**
 * Check if user coordinates are within ANY approved hub location.
 * Returns the closest hub's result.
 */
export function checkGeofence(userLat: number, userLon: number): GeofenceResult {
  let closestHub = HUB_LOCATIONS[0];
  let minDistance = haversineDistance(userLat, userLon, closestHub.latitude, closestHub.longitude);

  for (const hub of HUB_LOCATIONS.slice(1)) {
    const dist = haversineDistance(userLat, userLon, hub.latitude, hub.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestHub = hub;
    }
  }

  return {
    within: minDistance <= closestHub.radius,
    distanceM: Math.round(minDistance),
    hub: closestHub,
  };
}

/** Format distance for display */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${metres}m`;
  return `${(metres / 1000).toFixed(1)}km`;
}
