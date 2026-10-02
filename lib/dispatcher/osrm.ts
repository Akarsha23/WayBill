// Calculates straight-line distance in kilometers
export function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fetches actual driving distance in kilometers via OSRM
export async function getOSRMDrivingDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<number> {
  try {
    // Note: OSRM expects coordinates in {longitude},{latitude} order!
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP status: ${res.status}`);
    
    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      // OSRM returns distance in meters -> convert to kilometers
      return data.routes[0].distance / 1000;
    }
  } catch (err) {
    console.warn("OSRM endpoint unreachable, using Haversine with circuity fallback:", err);
  }

  // Fallback: Haversine straight-line distance with a 1.25 urban/suburban circuity factor
  return getHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng) * 1.25;
}