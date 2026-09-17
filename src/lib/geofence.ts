/**
 * geofence.ts
 * RIL Hub geolocation utilities.
 *
 * NOT the source of truth. Check-in eligibility is decided server-side by the
 * record_daily_checkin RPC against public.hub_locations — see
 * supabase/migrations/20260901000000_checkin_server_geofence.sql. The values
 * below are a client-side convenience copy (display defaults, dev simulation)
 * and can drift from the DB; a client-side geofence result must never gate a
 * check-in, since the caller controls this code and can decline to run it.
 * To move or resize a hub, update the hub_locations row.
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
    name: 'Renaissance Innovation Labs',
    latitude: 4.849500,   // 4°50'58.2"N
    longitude: 6.974278,  // 6°58'27.4"E
    radius: 50,           // 50m radius
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
